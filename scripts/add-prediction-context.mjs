import fs from 'fs';

const filePath = 'src/app/api/destiny-map/chat-stream/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const searchStr = `        v3Snapshot = buildAllDataPrompt(lang, theme, combinedResult);
        console.warn(\`[chat-stream] v3.1 snapshot built: \${v3Snapshot.length} chars\`);
      } catch (e) {
        console.warn("[chat-stream] Failed to build v3.1 snapshot:", e);
      }
    }

    // Few-shot examples for quality improvement`;

const replaceStr = `        v3Snapshot = buildAllDataPrompt(lang, theme, combinedResult);
        console.warn(\`[chat-stream] v3.1 snapshot built: \${v3Snapshot.length} chars\`);
      } catch (e) {
        console.warn("[chat-stream] Failed to build v3.1 snapshot:", e);
      }
    }

    // Build prediction context section if available (TIER 1-10 분석 결과)
    let predictionSection = "";
    if (predictionContext) {
      try {
        const pc = predictionContext as {
          eventType?: string;
          eventLabel?: string;
          optimalPeriods?: Array<{ startDate: string; endDate: string; score: number; grade: string; reasons?: string[] }>;
          avoidPeriods?: Array<{ startDate: string; score: number; reasons?: string[] }>;
          advice?: string;
          tierAnalysis?: { tier7to10?: { confidence: number } };
        };
        const lines: string[] = [];

        if (lang === "ko") {
          lines.push("\\n\\n[🔮 인생 예측 분석 결과 (TIER 1-10)]");
          if (pc.eventType) lines.push(\`이벤트 유형: \${pc.eventLabel || pc.eventType}\`);

          if (pc.optimalPeriods?.length) {
            lines.push("\\n✅ 최적 시기:");
            for (const period of pc.optimalPeriods.slice(0, 5)) {
              const start = new Date(period.startDate).toLocaleDateString('ko-KR');
              const end = new Date(period.endDate).toLocaleDateString('ko-KR');
              lines.push(\`• \${start} ~ \${end} (\${period.grade}등급, \${period.score}점)\`);
              if (period.reasons?.length) {
                lines.push(\`  이유: \${period.reasons.slice(0, 3).join(', ')}\`);
              }
            }
          }

          if (pc.avoidPeriods?.length) {
            lines.push("\\n⚠️ 피해야 할 시기:");
            for (const period of pc.avoidPeriods.slice(0, 3)) {
              const start = new Date(period.startDate).toLocaleDateString('ko-KR');
              lines.push(\`• \${start} (\${period.score}점) - \${period.reasons?.slice(0, 2).join(', ')}\`);
            }
          }

          if (pc.advice) lines.push(\`\\n💡 조언: \${pc.advice}\`);
          if (pc.tierAnalysis?.tier7to10?.confidence) {
            lines.push(\`\\n📊 분석 신뢰도: \${Math.round(pc.tierAnalysis.tier7to10.confidence * 100)}%\`);
          }
        } else {
          lines.push("\\n\\n[🔮 Life Prediction Analysis (TIER 1-10)]");
          if (pc.eventType) lines.push(\`Event Type: \${pc.eventLabel || pc.eventType}\`);

          if (pc.optimalPeriods?.length) {
            lines.push("\\n✅ Optimal Periods:");
            for (const period of pc.optimalPeriods.slice(0, 5)) {
              const start = new Date(period.startDate).toLocaleDateString('en-US');
              const end = new Date(period.endDate).toLocaleDateString('en-US');
              lines.push(\`• \${start} ~ \${end} (Grade \${period.grade}, Score \${period.score})\`);
              if (period.reasons?.length) {
                lines.push(\`  Reasons: \${period.reasons.slice(0, 3).join(', ')}\`);
              }
            }
          }

          if (pc.avoidPeriods?.length) {
            lines.push("\\n⚠️ Periods to Avoid:");
            for (const period of pc.avoidPeriods.slice(0, 3)) {
              const start = new Date(period.startDate).toLocaleDateString('en-US');
              lines.push(\`• \${start} (Score \${period.score}) - \${period.reasons?.slice(0, 2).join(', ')}\`);
            }
          }

          if (pc.advice) lines.push(\`\\n💡 Advice: \${pc.advice}\`);
          if (pc.tierAnalysis?.tier7to10?.confidence) {
            lines.push(\`\\n📊 Analysis Confidence: \${Math.round(pc.tierAnalysis.tier7to10.confidence * 100)}%\`);
          }
        }

        predictionSection = lines.join("\\n");
        console.warn(\`[chat-stream] Prediction context built: \${predictionSection.length} chars\`);
      } catch (e) {
        console.warn("[chat-stream] Failed to build prediction context:", e);
      }
    }

    // Few-shot examples for quality improvement`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(filePath, content);
  console.log('Prediction context section added successfully');
} else {
  console.log('Search string not found - file may have been modified');
}
