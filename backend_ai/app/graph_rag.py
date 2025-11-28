# backend_ai/app/graph_rag.py

import os
import csv
import json
import networkx as nx


class GraphRAG:
    """
    GraphRAG: 사주 + 점성 + 타로 + 크로스 그래프 융합 검색 엔진
    ----------------------------------------------------------
    - graph/  폴더: 각 분야별 노드·엣지 CSV (하위 모두 탐색)
    - rules/  폴더: 분야별 해석 / 상호 연결 룰 (JSON)
    """

    def __init__(self, base_dir: str = "../"):
        """
        base_dir  예시:
            - backend_ai/data/
            - backend_ai/data/graph/
        """
        # ✅ 절대경로 변환
        base_dir = os.path.abspath(base_dir)

        # ✅ graph_dir 자동 보정 (중복 방지)
        if os.path.basename(base_dir) == "graph":
            self.graph_dir = base_dir
        else:
            self.graph_dir = os.path.join(base_dir, "graph")

        self.rules_dir = os.path.join(base_dir, "rules")

        # ⚙️ 내부 데이터
        self.graph = nx.MultiDiGraph()
        self.rules = {}

        # 존재 확인
        if not os.path.exists(self.graph_dir):
            raise FileNotFoundError(f"[GraphRAG] ❌ 그래프 폴더 없음: {self.graph_dir}")
        if not os.path.exists(self.rules_dir):
            print(f"[GraphRAG] ⚠️ rules 폴더 없음: {self.rules_dir}")

        # 로드 실행
        self._load_all()

    # =====================================================================
    # 📦 전체 로드 (재귀적)
    # =====================================================================
    def _load_all(self):
        """graph_dir 하위 전체에서 node/edge CSV 와 rules JSON 로드"""
        # 1️⃣ 그래프 CSV 로드 (재귀)
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
                    print(f"[GraphRAG] ⚠️ CSV 로드 실패({path}): {e}")

        # 2️⃣ 룰 JSON 로드 (하위폴더 포함)
        if os.path.exists(self.rules_dir):
            for root, _, files in os.walk(self.rules_dir):
                for file in files:
                    if not file.endswith(".json"):
                        continue
                    key = os.path.splitext(file)[0]  # 예: life_path.json → 'life_path'
                    path = os.path.join(root, file)
                    try:
                        with open(path, encoding="utf-8") as f:
                            self.rules[key] = json.load(f)
                    except json.JSONDecodeError:
                        print(f"[GraphRAG] ⚠️ JSON 파싱 오류 → {file}")
                    except Exception as e:
                        print(f"[GraphRAG] ⚠️ 규칙 로드 실패 → {file}: {e}")

        print(f"[GraphRAG] ✅ 그래프 노드 {len(self.graph.nodes)}개 / 엣지 {len(self.graph.edges)}개 로드 완료")
        if self.rules:
            print(f"[GraphRAG] ✅ 규칙 세트: {', '.join(sorted(self.rules.keys()))}")
        else:
            print(f"[GraphRAG] ⚠️ 로드된 규칙 세트 없음")

    # =====================================================================
    # 🧩 Node / Edge 로더
    # =====================================================================
    def _load_nodes(self, path: str):
        """노드 CSV 로드"""
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                node_id = row.get("id") or row.get("label") or row.get("name")
                if not node_id:
                    continue
                self.graph.add_node(node_id, **row)

    def _load_edges(self, path: str):
        """엣지 CSV 로드"""
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                src = row.get("src") or row.get("source") or row.get("from")
                dst = row.get("dst") or row.get("target") or row.get("to")
                if not src or not dst:
                    continue
                rel = row.get("relation") or row.get("type") or "연결"
                desc = row.get("description") or row.get("desc", "")
                weight = row.get("weight") or "1"
                self.graph.add_edge(src, dst, relation=rel, desc=desc, weight=weight)

    # =====================================================================
    # 🔍 검색 / 질의
    # =====================================================================
    def query(self, facts: dict, domain_priority: str = "saju"):
        """
        facts: 사주·점성·타로 데이터 dict
        domain_priority: 'saju' | 'astro' | 'tarot' | 'fusion'
        """
        facts_str = json.dumps(facts, ensure_ascii=False)
        matched_nodes = []

        # 간단한 substring 매칭
        for n, d in self.graph.nodes(data=True):
            labels = [d.get("label", ""), d.get("name", ""), d.get("element", "")]
            if any(lbl and lbl in facts_str for lbl in labels):
                matched_nodes.append(n)

        # 연결 엣지 필터링
        edges = [
            {"src": u, "dst": v, "rel": d.get("relation"), "desc": d.get("desc", "")}
            for u, v, d in self.graph.edges(data=True)
            if u in matched_nodes or v in matched_nodes
        ]

        # 룰 요약
        rule_summary = None
        if domain_priority in self.rules:
            rule_summary = self._apply_rules(domain_priority, facts_str)

        # LLM 프롬프트용 context
        context_lines = [
            f"{e['src']} -[{e['rel']}]-> {e['dst']} ({e['desc']})"
            for e in edges[:50]
        ]
        context_text = "\n".join(context_lines)

        return {
            "matched_nodes": matched_nodes,
            "related_edges": edges,
            "rule_summary": rule_summary,
            "context_text": context_text,
            "stats": {"nodes": len(matched_nodes), "edges": len(edges)},
        }

    # =====================================================================
    # 🧠 룰 파일 기반 해석기
    # =====================================================================
    def _apply_rules(self, domain: str, facts_str: str):
        rulebook = self.rules.get(domain)
        if not rulebook:
            return None

        descs = []
        for key, rule in rulebook.items():
            # 딕셔너리형 규칙
            if isinstance(rule, dict):
                cond = rule.get("when")
                msg = rule.get("text")
                if cond and cond in facts_str and msg:
                    descs.append(msg)
            # 문자열형 규칙
            elif isinstance(rule, str):
                if key in facts_str:
                    descs.append(rule)

        # 최대 5개까지만
        return descs[:5] if descs else None