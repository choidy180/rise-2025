import { create } from 'zustand';

interface ProgressState {
  progress: number;
  userName: string;      // 이름 추가
  userRrn: string;       // 주민번호 추가
  setProgress: (step: number) => void;
  setSubmitData: (data: { name: string; rrn: string }) => void; // 데이터 저장 액션
}

export const useProgressStore = create<ProgressState>((set) => ({
  progress: 0,
  userName: '',
  userRrn: '',
  setProgress: (step) => set({ progress: step }),
  
  // 이 함수를 컴포넌트에서 호출해서 데이터를 저장합니다.
  setSubmitData: ({ name, rrn }) => set({ userName: name, userRrn: rrn }),
}));