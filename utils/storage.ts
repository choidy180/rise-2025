// utils/storage.ts

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

export interface HealthRecord {
  id: string;
  name: string; // 사용자 이름 (저장 시 입력)
  date: string; // 저장 일시 (ISO string)
  surveyResult: any; // 설문 결과 객체
  chatHistory: ChatMessage[]; // 대화 내역
  summary: string; // 리스트에서 보여줄 간단 요약 (optional)
}

const STORAGE_KEY = "clinivoice_records";

// 기록 저장
export const saveHealthRecord = (record: Omit<HealthRecord, "id" | "date">) => {
  const records = getHealthRecords();
  
  const newRecord: HealthRecord = {
    ...record,
    id: crypto.randomUUID(), // 고유 ID 생성
    date: new Date().toISOString(), // 저장 시점
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...records]));
  return newRecord.id;
};

// 전체 목록 불러오기
export const getHealthRecords = (): HealthRecord[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// 특정 ID 기록 불러오기
export const getRecordById = (id: string): HealthRecord | undefined => {
  const records = getHealthRecords();
  return records.find((r) => r.id === id);
};

// 날짜 포맷팅 (YYYY-MM-DD HH:mm:ss)
export const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};