// types/simple-5choice.ts

/** 모든 문항은 5지선다(1~5) 단일선택 */
export type FiveChoice = 1 | 2 | 3 | 4 | 5;

/** 문항 타입 — 필요 시 다른 타입이 생겨도 확장 가능 */
export type QuestionType = "five_choice";

/** 문항 정의: id, type, order, title 만 사용 */
export interface QuestionItem {
  /** 전역 유니크 식별자 (예: "Q1", "smoke_ever") */
  id: string;
  /** 현재는 항상 "five_choice" */
  type: QuestionType;
  /** 정렬/표시 순서 (1,2,3...) */
  order: number;
  /** 질문 텍스트 */
  title: string;
}

/** 설문 묶음(옵션) */
export interface Questionnaire {
  id: string;
  title: string;
  items: QuestionItem[];
}

/** 응답 데이터: 문항 id → 1~5 값 */
export type AnswerMap = Record<string, FiveChoice | null>;

/** 유틸: order 기준 정렬 */
export const sortByOrder = <T extends { order: number }>(arr: T[]) =>
  [...arr].sort((a, b) => a.order - b.order);
