import type { FC } from 'react';
import type { DaeunData, YeonunData, WolunData, IljinData } from '../../../../lib/Saju';
import { Section, UnseFlowContainer, UnsePillar } from '../components';
import IljinCalendar from '../../IljinCalendar';

interface Props {
  daeun: { daeunsu: number; cycles: DaeunData[] };
  displayedYeonun: YeonunData[];
  displayedWolun: WolunData[];
  displayedIljin: IljinData[];
  selectedDaeun: DaeunData | null;
  selectedYeonun: YeonunData | undefined;
  selectedWolun: WolunData | undefined;
  onDaeunClick: (item: DaeunData) => void;
  onYeonunClick: (item: YeonunData) => void;
  onWolunClick: (item: WolunData) => void;
}

const FortuneFlowSection: FC<Props> = ({
  daeun, displayedYeonun, displayedWolun, displayedIljin,
  selectedDaeun, selectedYeonun, selectedWolun,
  onDaeunClick, onYeonunClick, onWolunClick,
}) => (
  <>
    <Section title={`대운 (대운수: ${daeun.daeunsu})`}>
      <UnseFlowContainer aria-label="대운 목록">
        {daeun.cycles.map((item) => (
          <UnsePillar
            key={`daeun-${item.age}`}
            topText={`${item.age}세`}
            topSubText={item.sibsin.cheon}
            cheon={item.heavenlyStem}
            ji={item.earthlyBranch}
            bottomSubText={item.sibsin.ji}
            onClick={onDaeunClick}
            item={item}
            isSelected={selectedDaeun?.age === item.age}
          />
        ))}
      </UnseFlowContainer>
    </Section>

    <Section title="연운 (Annual Cycle)">
      <UnseFlowContainer aria-label="연운 목록">
        {displayedYeonun.map((item) => (
          <UnsePillar
            key={`yeonun-${item.year}`}
            topText={`${item.year}년`}
            topSubText={item.sibsin.cheon}
            cheon={item.heavenlyStem}
            ji={item.earthlyBranch}
            bottomSubText={item.sibsin.ji}
            onClick={onYeonunClick}
            item={item}
            isSelected={selectedYeonun?.year === item.year}
          />
        ))}
      </UnseFlowContainer>
    </Section>

    <Section title="월운 (Monthly Cycle)">
      <UnseFlowContainer aria-label="월운 목록">
        {displayedWolun.map((item) => (
          <UnsePillar
            key={`wolun-${item.month}`}
            topText={`${item.month}월`}
            topSubText={item.sibsin.cheon}
            cheon={item.heavenlyStem}
            ji={item.earthlyBranch}
            bottomSubText={item.sibsin.ji}
            onClick={onWolunClick}
            item={item}
            isSelected={selectedWolun?.month === item.month && selectedWolun?.year === item.year}
          />
        ))}
      </UnseFlowContainer>
    </Section>

    <Section title="일진 달력 (Daily Calendar)">
      <IljinCalendar iljinData={displayedIljin} year={selectedWolun?.year} month={selectedWolun?.month} />
    </Section>
  </>
);

export default FortuneFlowSection;
