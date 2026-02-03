import type { Dispatch, SetStateAction } from 'react'
import type { Profile } from '../types'
import DateTimePicker from '@/components/ui/DateTimePicker'

interface ProfileEditorProps {
  styles: Record<string, string>
  profile: Profile
  isEditingProfile: boolean
  editedProfile: Profile
  setEditedProfile: Dispatch<SetStateAction<Profile>>
  isSavingProfile: boolean
  handleEditProfile: () => void
  handleCancelEdit: () => void
  handleSaveProfile: () => void
  t: (key: string, fallback?: string) => string
}

export function ProfileEditor({
  styles,
  profile,
  isEditingProfile,
  editedProfile,
  setEditedProfile,
  isSavingProfile,
  handleEditProfile,
  handleCancelEdit,
  handleSaveProfile,
  t,
}: ProfileEditorProps) {
  return (
    <div className={styles.profileInfoCard}>
      <div className={styles.profileInfoHeader}>
        <h3>{t('myjourney.profile.title', 'Profile Information')}</h3>
        {!isEditingProfile ? (
          <button
            className={styles.editButton}
            onClick={handleEditProfile}
            aria-label={t('myjourney.profile.edit', 'Edit Profile')}
          >
            <span className={styles.editIcon}>{'\u270F\uFE0F'}</span>
            <span>{t('myjourney.profile.edit', 'Edit')}</span>
          </button>
        ) : (
          <div className={styles.editActions}>
            <button
              className={styles.cancelButton}
              onClick={handleCancelEdit}
              disabled={isSavingProfile}
            >
              {t('myjourney.profile.cancel', 'Cancel')}
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile
                ? t('myjourney.profile.saving', 'Saving...')
                : t('myjourney.profile.save', 'Save')}
            </button>
          </div>
        )}
      </div>

      <div className={styles.profileInfoGrid}>
        {/* Birth Date */}
        <div className={styles.profileInfoItem}>
          {!isEditingProfile && (
            <label className={styles.profileInfoLabel}>
              <span className={styles.labelIcon}>{'\uD83D\uDCC5'}</span>
              {t('common.birthDate', 'Birth Date')}
            </label>
          )}
          {isEditingProfile ? (
            <DateTimePicker
              value={editedProfile.birthDate || ''}
              onChange={(value) => setEditedProfile((prev) => ({ ...prev, birthDate: value }))}
              label={t('common.birthDate', 'Birth Date')}
              locale={t('common.locale', 'ko') as 'ko' | 'en'}
            />
          ) : (
            <div className={styles.profileInfoValue}>
              {profile.birthDate || t('myjourney.profile.notSet', 'Not set')}
            </div>
          )}
        </div>

        {/* Birth Time */}
        <div className={styles.profileInfoItem}>
          <label className={styles.profileInfoLabel}>
            <span className={styles.labelIcon}>{'\uD83D\uDD50'}</span>
            {t('common.birthTime', 'Birth Time')}
          </label>
          {isEditingProfile ? (
            <input
              type="time"
              className={styles.profileInfoInput}
              value={editedProfile.birthTime || ''}
              onChange={(e) => setEditedProfile((prev) => ({ ...prev, birthTime: e.target.value }))}
            />
          ) : (
            <div className={styles.profileInfoValue}>
              {profile.birthTime || t('myjourney.profile.notSet', 'Not set')}
            </div>
          )}
        </div>

        {/* Birth City */}
        <div className={styles.profileInfoItem}>
          <label className={styles.profileInfoLabel}>
            <span className={styles.labelIcon}>{'\uD83C\uDF0D'}</span>
            {t('common.birthCity', 'Birth City')}
          </label>
          {isEditingProfile ? (
            <input
              type="text"
              className={styles.profileInfoInput}
              value={editedProfile.birthCity || ''}
              onChange={(e) => setEditedProfile((prev) => ({ ...prev, birthCity: e.target.value }))}
              placeholder={t('common.birthCityPlaceholder', 'e.g. Seoul, Busan')}
            />
          ) : (
            <div className={styles.profileInfoValue}>
              {profile.birthCity || t('myjourney.profile.notSet', 'Not set')}
            </div>
          )}
        </div>

        {/* Gender */}
        <div className={styles.profileInfoItem}>
          <label className={styles.profileInfoLabel}>
            <span className={styles.labelIcon}>{'\uD83D\uDC64'}</span>
            {t('common.gender', 'Gender')}
          </label>
          {isEditingProfile ? (
            <select
              className={styles.profileInfoInput}
              value={editedProfile.gender || ''}
              onChange={(e) => setEditedProfile((prev) => ({ ...prev, gender: e.target.value }))}
            >
              <option value="">{t('common.optional', 'Optional')}</option>
              <option value="male">{t('common.male', 'Male')}</option>
              <option value="female">{t('common.female', 'Female')}</option>
            </select>
          ) : (
            <div className={styles.profileInfoValue}>
              {profile.gender
                ? t(`common.${profile.gender}`, profile.gender)
                : t('myjourney.profile.notSet', 'Not set')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
