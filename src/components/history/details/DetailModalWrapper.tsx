import { DestinyMapDetail } from './DestinyMapDetail';
import { CalendarDetail } from './CalendarDetail';
import { TarotDetail } from './TarotDetail';
import { IChingDetail } from './IChingDetail';
import { NumerologyDetail } from './NumerologyDetail';
import { ICPDetail } from './ICPDetail';
import { CompatibilityDetail } from './CompatibilityDetail';
import { MatrixDetail } from './MatrixDetail';
import type {
  ServiceRecord,
  DestinyMapContent,
  CalendarContent,
  TarotContent,
  IChingContent,
  NumerologyContent,
  ICPContent,
  PersonalityCompatibilityContent,
  DestinyMatrixContent,
} from '@/app/myjourney/history/lib/types';
import styles from './DetailModal.module.css';

type DetailContent =
  | DestinyMapContent
  | CalendarContent
  | TarotContent
  | IChingContent
  | NumerologyContent
  | ICPContent
  | PersonalityCompatibilityContent
  | DestinyMatrixContent;

type DetailModalWrapperProps = {
  record: ServiceRecord | null;
  destinyMapDetail: DestinyMapContent | null;
  calendarDetail: CalendarContent | null;
  tarotDetail: TarotContent | null;
  ichingDetail: IChingContent | null;
  numerologyDetail: NumerologyContent | null;
  icpDetail: ICPContent | null;
  compatibilityDetail: PersonalityCompatibilityContent | null;
  matrixDetail: DestinyMatrixContent | null;
  loading: boolean;
  onClose: () => void;
};

export function DetailModalWrapper({
  record,
  destinyMapDetail,
  calendarDetail,
  tarotDetail,
  ichingDetail,
  numerologyDetail,
  icpDetail,
  compatibilityDetail,
  matrixDetail,
  loading,
  onClose,
}: DetailModalWrapperProps) {
  if (!record) {return null;}

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ✕
        </button>

        {loading ? (
          <div className={styles.modalLoading}>
            <div className={styles.spinner}></div>
            <p>불러오는 중...</p>
          </div>
        ) : destinyMapDetail ? (
          <DestinyMapDetail detail={destinyMapDetail} />
        ) : calendarDetail ? (
          <CalendarDetail detail={calendarDetail} />
        ) : tarotDetail ? (
          <TarotDetail detail={tarotDetail} recordDate={record.date} />
        ) : ichingDetail ? (
          <IChingDetail detail={ichingDetail} />
        ) : numerologyDetail ? (
          <NumerologyDetail detail={numerologyDetail} />
        ) : icpDetail ? (
          <ICPDetail detail={icpDetail} />
        ) : compatibilityDetail ? (
          <CompatibilityDetail detail={compatibilityDetail} />
        ) : matrixDetail ? (
          <MatrixDetail detail={matrixDetail} />
        ) : (
          <div className={styles.modalError}>
            <p>Failed to load reading details</p>
          </div>
        )}
      </div>
    </div>
  );
}
