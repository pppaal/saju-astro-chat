/**
 * Detail Modal Wrapper
 *
 * Container for all service detail modals
 */

import React from 'react';
import type {
  ServiceRecord,
  IChingContent,
  DestinyMapContent,
  CalendarContent,
  TarotContent,
  NumerologyContent,
  ICPContent,
  PersonalityCompatibilityContent,
  DestinyMatrixContent,
} from '../lib';
import { IChingDetailModal } from './modals/IChingDetailModal';
import { DestinyMapDetailModal } from './modals/DestinyMapDetailModal';
import { CalendarDetailModal } from './modals/CalendarDetailModal';
import { TarotDetailModal } from './modals/TarotDetailModal';
import { NumerologyDetailModal } from './modals/NumerologyDetailModal';
import { ICPDetailModal } from './modals/ICPDetailModal';
import { CompatibilityDetailModal } from './modals/CompatibilityDetailModal';
import { MatrixDetailModal } from './modals/MatrixDetailModal';
import styles from '../history.module.css';

export interface DetailModalWrapperProps {
  selectedRecord: ServiceRecord | null;
  detailLoading: boolean;
  ichingDetail: IChingContent | null;
  destinyMapDetail: DestinyMapContent | null;
  calendarDetail: CalendarContent | null;
  tarotDetail: TarotContent | null;
  numerologyDetail: NumerologyContent | null;
  icpDetail: ICPContent | null;
  compatibilityDetail: PersonalityCompatibilityContent | null;
  matrixDetail: DestinyMatrixContent | null;
  closeDetail: () => void;
}

export function DetailModalWrapper(props: DetailModalWrapperProps) {
  const {
    selectedRecord,
    detailLoading,
    ichingDetail,
    destinyMapDetail,
    calendarDetail,
    tarotDetail,
    numerologyDetail,
    icpDetail,
    compatibilityDetail,
    matrixDetail,
    closeDetail,
  } = props;

  if (!selectedRecord) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeDetail}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={closeDetail}>
          ×
        </button>

        {detailLoading ? (
          <div className={styles.modalLoading}>
            <div className={styles.spinner}></div>
            <p>Loading...</p>
          </div>
        ) : destinyMapDetail ? (
          <DestinyMapDetailModal detail={destinyMapDetail} />
        ) : calendarDetail ? (
          <CalendarDetailModal detail={calendarDetail} />
        ) : tarotDetail ? (
          <TarotDetailModal detail={tarotDetail} selectedRecord={selectedRecord} />
        ) : ichingDetail ? (
          <IChingDetailModal detail={ichingDetail} />
        ) : numerologyDetail ? (
          <NumerologyDetailModal detail={numerologyDetail} />
        ) : icpDetail ? (
          <ICPDetailModal detail={icpDetail} />
        ) : compatibilityDetail ? (
          <CompatibilityDetailModal detail={compatibilityDetail} />
        ) : matrixDetail ? (
          <MatrixDetailModal detail={matrixDetail} />
        ) : (
          <div className={styles.modalError}>
            <p>Failed to load reading details</p>
          </div>
        )}
      </div>
    </div>
  );
}
