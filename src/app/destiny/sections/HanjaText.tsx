/**
 * 문장 속 한자 묶음(壬 · 丁未 · 天乙 …)을 한 덩어리로 감싼다 — 줄바꿈이 간지를 가르지 않고
 * (丁 / 未), 한자 글꼴로 보이게. 뷰모델 문장은 그대로(글자를 바꾸지 않는다).
 */

import s from '../LifeFlow.module.css'

const HANJA_RUN = /([㐀-鿿]+)/

export default function HanjaText({ text }: { text: string }) {
  const parts = text.split(HANJA_RUN)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className={s.hjRun}>
            {p}
          </span>
        ) : (
          p
        )
      )}
    </>
  )
}
