##backend_ai/app/graph_rag.py

import os
import csv
import json
import networkx as nx
import torch
from sentence_transformers import SentenceTransformer, util


class GraphRAG:
    """
    GraphRAG: 사주 + 점성 + 타로 + 크로스 그래프 융합 검색 엔진
    ----------------------------------------------------------
    - graph/ : 각 분야별 노드·엣지 CSV (하위 전체 탐색)
    - rules/ : 분야별 해석 / 상호 연결 룰 (JSON)
    """

    def __init__(self, base_dir: str = "../"):
        # ✅ 절대경로 보정
        base_dir = os.path.abspath(base_dir)
        if os.path.basename(base_dir) == "graph":
            self.graph_dir = base_dir
        else:
            self.graph_dir = os.path.join(base_dir, "graph")
        # prefer graph/rules, fallback to sibling rules
        preferred_rules = os.path.join(self.graph_dir, "rules")
        fallback_rules = os.path.join(base_dir, "rules")
        self.rules_dir = preferred_rules if os.path.isdir(preferred_rules) else fallback_rules

        # ✅ 내부 구조 초기화
        self.graph = nx.MultiDiGraph()
        self.rules = {}

        # ✅ SentenceTransformer 초기화 (CPU 강제 — meta tensor 오류 방지)
        # PyTorch 2.6+ meta tensor compatibility fix
        os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
        torch.set_default_device("cpu")
        self.embed_model = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            device="cpu"
        )

        self.node_embeds = None
        self.node_texts = []

        # ✅ 존재 확인
        if not os.path.exists(self.graph_dir):
            raise FileNotFoundError(f"[GraphRAG] ❌ 그래프 폴더 없음: {self.graph_dir}")
        if not os.path.exists(self.rules_dir):
            try:
                print(f"[GraphRAG] ⚠️ rules 폴더 없음: {self.rules_dir}".encode('utf-8', errors='replace').decode('utf-8'))
            except:
                print(f"[GraphRAG] Rules folder not found: {self.rules_dir}")

        # ✅ 초기 로드
        self._load_all()
        self._prepare_embeddings()

    # =====================================================================
    # 📦 전체 로드 (재귀적)
    # =====================================================================
    def _load_all(self):
        """graph_dir 하위 전체 노드·엣지 CSV 및 rules 폴더 JSON 로드"""
        # 1️⃣ 그래프 CSV 로드
        for root, _, files in os.walk(self.graph_dir):
            for file in files:
                path = os.path.join(root, file)
                if not file.lower().endswith(".csv"):
                    continue
                name = file.lower()
                try:
                    if "node" in name:
                        self._load_nodes(path)
                    elif any(x in name for x in ["edge", "relation", "link"]):
                        self._load_edges(path)
                except Exception as e:
                    try:
                        print(f"[GraphRAG] ⚠️ CSV 로드 실패({path}): {e}".encode('utf-8', errors='replace').decode('utf-8'))
                    except:
                        print(f"[GraphRAG] CSV load failed({path}): {e}")

        # 2️⃣ 룰 JSON 로드
        if os.path.exists(self.rules_dir):
            for root, _, files in os.walk(self.rules_dir):
                for file in files:
                    if not file.lower().endswith(".json"):
                        continue
                    key = os.path.splitext(file)[0]
                    path = os.path.join(root, file)
                    try:
                        with open(path, encoding="utf-8") as f:
                            self.rules[key] = json.load(f)
                    except json.JSONDecodeError:
                        try:
                            print(f"[GraphRAG] ⚠️ JSON 파싱 오류 → {file}".encode('utf-8', errors='replace').decode('utf-8'))
                        except:
                            print(f"[GraphRAG] JSON parse error: {file}")
                    except Exception as e:
                        try:
                            print(f"[GraphRAG] ⚠️ 규칙 로드 실패 → {file}: {e}".encode('utf-8', errors='replace').decode('utf-8'))
                        except:
                            print(f"[GraphRAG] Rule load failed: {file}: {e}")

        try:
            print(
                f"[GraphRAG] ✅ 그래프 노드 {len(self.graph.nodes)}개 / 엣지 {len(self.graph.edges)}개 로드 완료".encode('utf-8', errors='replace').decode('utf-8')
            )
        except:
            print(f"[GraphRAG] Graph nodes {len(self.graph.nodes)} / edges {len(self.graph.edges)} loaded")
        if self.rules:
            try:
                print(f"[GraphRAG] ✅ 규칙 세트: {', '.join(sorted(self.rules.keys()))}".encode('utf-8', errors='replace').decode('utf-8'))
            except:
                print(f"[GraphRAG] Rules loaded: {', '.join(sorted(self.rules.keys()))}")
        else:
            try:
                print(f"[GraphRAG] ⚠️ 로드된 규칙 세트 없음".encode('utf-8', errors='replace').decode('utf-8'))
            except:
                print(f"[GraphRAG] No rules loaded")

    # =====================================================================
    # 🧩 Node / Edge 로더
    # =====================================================================
    def _load_nodes(self, path: str):
        """노드 CSV 로드"""
        with open(path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                node_id = row.get("id") or row.get("label") or row.get("name")
                if not node_id:
                    continue
                self.graph.add_node(node_id, **row)

    def _load_edges(self, path: str):
        """엣지 CSV 로드"""
        with open(path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                src = row.get("src") or row.get("source") or row.get("from")
                dst = row.get("dst") or row.get("target") or row.get("to")
                if not src or not dst:
                    continue
                rel = row.get("relation") or row.get("type") or "연결"
                desc = row.get("description") or row.get("desc") or ""
                weight = row.get("weight") or "1"
                self.graph.add_edge(src, dst, relation=rel, desc=desc, weight=weight)

    # =====================================================================
    # 🧠 노드 임베딩 준비
    # =====================================================================
    def _prepare_embeddings(self):
        """노드 텍스트 → 임베딩 캐시"""
        texts = []
        for n, d in self.graph.nodes(data=True):
            text = " ".join(
                filter(
                    None,
                    [
                        d.get("label"),
                        d.get("name"),
                        d.get("desc"),
                        d.get("element"),
                    ],
                )
            ).strip()
            texts.append(text)
        self.node_texts = texts
        if not texts:
            self.node_embeds = None
            try:
                print("[GraphRAG] ⚠️ 임베딩 대상 노드 텍스트가 없습니다.".encode('utf-8', errors='replace').decode('utf-8'))
            except:
                print("[GraphRAG] No node text for embeddings")
            return

        self.node_embeds = self.embed_model.encode(
            texts,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        try:
            print(
                f"[GraphRAG] 🔹 임베딩 {self.node_embeds.size(0)}개 생성 및 캐시 완료".encode('utf-8', errors='replace').decode('utf-8')
            )
        except:
            print(f"[GraphRAG] Embeddings {self.node_embeds.size(0)} generated and cached")

    # =====================================================================
    # 🔍 임베딩 기반 검색
    # =====================================================================
    def query(self, facts: dict, top_k: int = 8, domain_priority: str = "saju"):
        """입력된 facts 딕셔너리를 그래프 노드 임베딩과 비교"""
        facts_str = json.dumps(facts, ensure_ascii=False)

        # ✅ 텐서의 bool 평가 에러 방지
        if self.node_embeds is None or self.node_embeds.size(0) == 0:
            return {
                "matched_nodes": [],
                "related_edges": [],
                "rule_summary": None,
                "context_text": "",
                "stats": {},
            }

        # 👉 질의 임베딩
        query_emb = self.embed_model.encode(
            facts_str,
            convert_to_tensor=True,
            normalize_embeddings=True,
        )
        cos_scores = util.cos_sim(query_emb, self.node_embeds)[0]
        top_results = torch.topk(cos_scores, k=min(top_k, self.node_embeds.size(0)))

        matched_nodes = [self.node_texts[i] for i in top_results.indices]
        matched_score = [float(cos_scores[i]) for i in top_results.indices]

        # 관련 엣지
        edges = [
            {
                "src": u,
                "dst": v,
                "rel": d.get("relation"),
                "desc": d.get("desc", ""),
            }
            for u, v, d in self.graph.edges(data=True)
            if any(n in (u, v) for n in matched_nodes)
        ]

        # 룰 요약
        rule_summary = (
            self._apply_rules(domain_priority, facts_str)
            if domain_priority in self.rules
            else None
        )

        # 콘텍스트 텍스트
        context_lines = [
            f"{matched_nodes[i]} (score: {matched_score[i]:.3f})"
            for i in range(len(matched_nodes))
        ]
        edge_lines = [f"{e['src']}→{e['dst']}({e['rel']})" for e in edges[:30]]
        context_text = "\n".join(context_lines + edge_lines)

        return {
            "matched_nodes": matched_nodes,
            "related_edges": edges,
            "rule_summary": rule_summary,
            "context_text": context_text,
            "stats": {"nodes": len(matched_nodes), "edges": len(edges)},
        }

    # =====================================================================
    # 🧠 룰 적용 (간단 조건 기반)
    # =====================================================================
    def _apply_rules(self, domain: str, facts_str: str):
        """rules/*.json 조건문 적용"""
        rulebook = self.rules.get(domain)
        if not rulebook:
            return None
        descs = []
        for key, rule in rulebook.items():
            if isinstance(rule, dict):
                cond = rule.get("when")
                msg = rule.get("text")
                if cond and cond in facts_str and msg:
                    descs.append(msg)
            elif isinstance(rule, str):
                if key in facts_str:
                    descs.append(rule)
        return descs[:5] if descs else None
