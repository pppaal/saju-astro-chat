/**
 * fortuneCharts.js
 * - 오행 파이차트 / 대운 타임라인 시각화
 * - reportService 결과(result.saju, result.astrology)를 기반으로 호출
 */

export function renderFortuneCharts(containerId, sajuData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const fiveElements = sajuData.fiveElements ?? {};
  const daeun = Array.isArray(sajuData.unse?.daeun)
    ? sajuData.unse.daeun
    : [];

  // 🌕 오행 차트
  const chartCanvas = document.createElement("canvas");
  chartCanvas.id = "fiveElementsChart";
  chartCanvas.width = 320;
  chartCanvas.height = 320;
  container.appendChild(chartCanvas);

  const ctx = chartCanvas.getContext("2d");
  // CDN이나 별도 import 없이 전역 Chart 존재한다고 가정
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(fiveElements),
      datasets: [
        {
          data: Object.values(fiveElements),
          backgroundColor: [
            "#66BB6A", // 목
            "#FF7043", // 화
            "#FDD835", // 토
            "#B0BEC5", // 금
            "#42A5F5", // 수
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "오행 에너지 분포 🌿",
          color: "#fff",
          font: { size: 16 },
        },
        legend: { labels: { color: "#ddd" } },
      },
    },
  });

  // 🕰 대운 타임라인
  const timeline = document.createElement("div");
  timeline.style.display = "flex";
  timeline.style.justifyContent = "space-around";
  timeline.style.marginTop = "1rem";
  timeline.style.color = "#ccc";
  timeline.style.fontSize = "0.9rem";
  timeline.style.width = "100%";
  container.appendChild(timeline);

  daeun.forEach((d) => {
    const segment = document.createElement("div");
    segment.innerHTML = `
      <div style="text-align:center;">
        <div style="font-weight:bold;color:#fff">${d.ganji ?? ""}</div>
        <div style="font-size:0.8em">${d.age ?? ""}세~${(d.age ?? 0) + 10}세</div>
      </div>`;
    timeline.appendChild(segment);
  });
}