"use client";

import React, { FormEvent } from 'react';

// 부모로부터 함수와 상태를 전달받습니다 (Props)
interface UserInfoFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

// 이 컴포넌트는 오직 UI를 그리고, 제출 이벤트가 발생하면
// 부모가 알려준 onSubmit 함수를 실행하는 역할만 합니다.
const UserInfoForm = ({ onSubmit, isLoading }: UserInfoFormProps) => {
  return (
    <form className="destiny-form" onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="birthdate">생년월일</label>
        <input type="date" id="birthdate" name="birthdate" defaultValue="1995-02-09" required />
      </div>
      <div className="form-group">
        <label htmlFor="birthtime">태어난 시간</label>
        <input type="time" id="birthtime" name="birthtime" defaultValue="06:40" required />
      </div>
      <div className="form-group">
        <label htmlFor="gender">성별</label>
        <select id="gender" name="gender" defaultValue="male" required>
          <option value="male">남자</option>
          <option value="female">여자</option>
        </select>
      </div>
      <button type="submit" className="submit-button" disabled={isLoading}>
        {isLoading ? '분석 중...' : '분석 시작'}
      </button>
    </form>
  );
};

export default UserInfoForm;