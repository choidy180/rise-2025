"use client";

import { useState } from "react";
import styled from "styled-components";
import { questionnaire } from "@/data/questionnaire/questionnaire-data";
import { useQuestionnaireStore } from "@/store/questionnaire";
import type { Question } from "@/data/questionnaire/questionnaire-schema";

export default function QuestionnaireFlow() {
  const { currentIndex, answers, setAnswer, next, prev } = useQuestionnaireStore();
  const allQuestions = questionnaire.sections.flatMap((s) => s.questions);
  const q = allQuestions[currentIndex];
  const total = allQuestions.length;

  const [inputValue, setInputValue] = useState<string>("");

  if (!q) return <Wrapper>질문지를 불러올 수 없습니다.</Wrapper>;

  const handleNext = () => {
    // if (inputValue.trim() !== "") {
    //   setAnswer(q.id, inputValue);
    //   setInputValue("");
    //   next();
    // } else {
    //   alert("답변을 입력해주세요.");
    // }
    setAnswer(q.id, inputValue);
    setInputValue("");
    next();
  };

  return (
    <Wrapper>
      <ProgressBox>
        <span>질문 {currentIndex + 1} / {total}</span>
      </ProgressBox>

      <QuestionText>{q.text}</QuestionText>

      <AnswerBox>
        {q.type === "single" && q.options && (
          <Select
            value={String(answers[q.id] ?? "")}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          >
            <option value="">선택하세요</option>
            {q.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        )}

        {q.type === "text" && (
          <Input
            type="text"
            placeholder="답변 입력"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )}

        {q.type === "number" && (
          <Input
            type="number"
            placeholder="숫자를 입력하세요"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )}

        {/* 추가 타입은 추후 확장 */}
      </AnswerBox>

      <NavBox>
        <Button onClick={prev} disabled={currentIndex === 0}>
          이전
        </Button>
        <Button onClick={handleNext}>
          {currentIndex + 1 === total ? "제출" : "다음"}
        </Button>
      </NavBox>
    </Wrapper>
  );
}

/* ---------------- styled ---------------- */
const Wrapper = styled.div`
  width: 100%;
  max-width: 640px;
  margin: 120px auto 40px;
  padding: 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 24px;
`;

const ProgressBox = styled.div`
  font-size: 0.9rem;
  color: #6b7280;
  text-align: right;
`;

const QuestionText = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
`;

const AnswerBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Input = styled.input`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 1rem;
  outline: none;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
  }
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 1rem;
  outline: none;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
  }
`;

const NavBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Button = styled.button`
  flex: 1;
  max-width: 120px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: #6366f1;
  transition: background 0.2s ease;
  &:hover {
    background: #4f46e5;
  }
  &:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }
`;
