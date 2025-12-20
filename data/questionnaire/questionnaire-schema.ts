// 판별 유니온으로 'table'과 비-테이블 타입을 분리하여 TS 오류 방지

export type AnswerValue =
  | string
  | number
  | boolean
  | string[]
  | { [k: string]: string | number | null };

export type Option = { value: string; label: string };

// ✅ "table"을 제외한 일반 문항 타입
export type NonTableType =
  | "single"
  | "multi"
  | "boolean"
  | "number"
  | "text"
  | "date";

export type BaseQuestion = {
  id: string;
  section: string;
  text: string;
  type: NonTableType; // "table" 빠짐
  options?: Option[]; // single/multi에 사용
  required?: boolean;
  dependsOn?: { id: string; showIf: (val: AnswerValue) => boolean };
  meta?: { unit?: string; hint?: string; placeholder?: string };
};

// ✅ 테이블 문항 전용 타입
export type TableColumn = {
  key: string;
  label: string;
  type: "number" | "text";
  meta?: { unit?: string; hint?: string; placeholder?: string };
};

export type TableQuestion = {
  id: string;
  section: string;
  text: string;
  type: "table"; // 판별 키
  required?: boolean;
  rows: { key: string; label: string }[];
  cols: TableColumn[];
  meta?: { hint?: string };
  dependsOn?: { id: string; showIf: (val: AnswerValue) => boolean };
};

// ✅ 최종 유니온
export type Question = BaseQuestion | TableQuestion;

// 설문 전체 스키마
export interface Questionnaire {
  id: string;
  title: string;
  sections: {
    key: string;
    title: string;
    questions: Question[];
  }[];
}

// 응답 스키마
export type Answers = Record<string, AnswerValue>;
