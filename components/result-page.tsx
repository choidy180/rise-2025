"use client";

import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

// ✅ 사용자 경로에 맞춘 import (그대로 유지)
import { CHECKUP_QUESTIONS_REMAKE, CheckupQuestion } from "@/data/questionnaire/questionnaire-data-remake";
import { SurveyResult } from "@/utils/survey-summary";
import { ChatMessage, saveHealthRecord } from "@/utils/storage";
import GeminiChat from "./gemini-chat";
import SimpleScenarioPage from "./voice-chatbot-modal";

interface Props {
  result: SurveyResult;
  initialMessages?: ChatMessage[];
  readOnly?: boolean;
  onRestart?: () => void;
  userName?: string;
}

// 🏗️ 1. 대분류 그룹핑 로직
const getDisplaySection = (rawCategory: string) => {
  if (rawCategory.includes("흡연") || rawCategory.includes("전자담배") || rawCategory.includes("액상") || rawCategory.includes("금연")) {
    return { title: "흡연 및 담배 습관", icon: "🚬", order: 2 };
  }
  if (rawCategory.includes("음주")) {
    return { title: "음주 습관", icon: "🍺", order: 3 };
  }
  if (rawCategory.includes("운동") || rawCategory.includes("고강도") || rawCategory.includes("중강도") || rawCategory.includes("근력")) {
    return { title: "신체 활동 (운동)", icon: "💪", order: 4 };
  }
  if (rawCategory.includes("식사") || rawCategory.includes("영양") || rawCategory.includes("건강식") || rawCategory.includes("주의식")) {
    return { title: "식생활 및 영양", icon: "🥗", order: 5 };
  }
  if (rawCategory.includes("기억") || rawCategory.includes("판단") || rawCategory.includes("성격")) {
    return { title: "정신 건강 및 인지", icon: "🧠", order: 6 };
  }
  if (rawCategory.includes("질환") || rawCategory.includes("가족") || rawCategory.includes("감염") || rawCategory.includes("예방") || rawCategory.includes("낙상") || rawCategory.includes("배뇨")) {
    return { title: "질환력 및 신체 기능", icon: "🏥", order: 1 };
  }
  return { title: "기타 및 일상 생활", icon: "📋", order: 7 };
};

// 📊 미니 차트 컴포넌트
const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <BarContainer>
      <BarFill
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        $color={color}
      />
    </BarContainer>
  );
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function ResultPage({
  result,
  onRestart,
  initialMessages = [],
  readOnly = false,
  userName = "방문자",
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  // 🔄 2. 데이터 그룹화 (Section 별로 데이터 구조 재편성)
  const groupedSections = useMemo(() => {
    const sections: Record<string, { 
      title: string; 
      icon: string; 
      order: number;
      items: { q: CheckupQuestion; val: number; label: string; isSkipped: boolean }[] 
    }> = {};

    CHECKUP_QUESTIONS_REMAKE.forEach((q, idx) => {
      // 1) 답변 값 찾기 (props로 넘어온 result 사용)
      const myVal = result.answers[idx]; 
      
      // 답변이 null/0/undefined이면 건너뛴 항목
      const isSkipped = myVal === null || myVal === 0 || myVal === undefined;
      const safeVal = isSkipped ? 0 : myVal;

      // 2) 라벨 텍스트 찾기
      let label = "-";
      if (!isSkipped && q.options) {
        const found = q.options.find((opt) => opt.value === safeVal);
        if (found) label = found.label;
      } else if (isSkipped) {
        label = "해당 없음";
      }

      // 3) 대분류 섹션 매핑
      const sectionInfo = getDisplaySection(q.category);
      const sectionKey = sectionInfo.title;

      if (!sections[sectionKey]) {
        sections[sectionKey] = { ...sectionInfo, items: [] };
      }

      sections[sectionKey].items.push({ q, val: safeVal, label, isSkipped });
    });

    // order 순으로 정렬하여 배열로 반환
    return Object.values(sections).sort((a, b) => a.order - b.order);
  }, [result]);

  const handleSave = () => {
    const nameToSave = userName || "방문자";
    saveHealthRecord({
      name: nameToSave,
      surveyResult: result,
      chatHistory: messages,
      summary: `종합 문진 결과 Report`,
    });
    if (confirm("저장되었습니다. 기록 보관함으로 이동하시겠습니까?")) {
      router.push("/history");
    }
  };

  return (
    <PageLayout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <ContentWrapper>
        {/* [LEFT] 대시보드 리포트 영역 */}
        <DashboardColumn>
          <DashboardHeader>
            <TitleArea>
              <MainTitle>
                <Highlight>{userName}</Highlight>님의 건강 리포트
              </MainTitle>
              <SubDesc>
                {readOnly ? "지난 기록 조회" : "응답 내용을 종합적으로 분석했습니다."}
              </SubDesc>
            </TitleArea>
            <SimpleScenarioPage/>
            {!readOnly && <SaveBadge onClick={handleSave}>💾 결과 저장</SaveBadge>}
          </DashboardHeader>

          {/* 🧩 섹션별 카드 리스트 */}
          <SectionsContainer>
            {groupedSections.map((section, secIdx) => {
              // 유효한 응답이 하나도 없는 섹션은 렌더링 제외
              const hasValidAnswers = section.items.some(i => !i.isSkipped);
              if (!hasValidAnswers) return null;

              return (
                <SectionCard
                  key={section.title}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: secIdx * 0.1 }}
                >
                  <SectionHeader>
                    <IconBox>{section.icon}</IconBox>
                    <SectionTitle>{section.title}</SectionTitle>
                  </SectionHeader>

                  <SectionContent>
                    {section.items.map(({ q, val, label, isSkipped }) => {
                      if (isSkipped) return null; // 건너뛴 항목 숨김

                      // 상태 색상 로직
                      let statusColor = "#3b82f6"; // 기본 Blue
                      
                      if (q.isReverse) {
                         // 역방향: 값이 높을수록 부정적 (예: 질환 있음=2)
                         if (val >= (q.options?.length || 5) / 2) statusColor = "#f59e0b"; // Orange
                         if (val === (q.options?.length || 5) || (val === 2 && q.type === 'yesno')) statusColor = "#ef4444"; // Red
                      } else {
                         // 정방향: 값이 높을수록 긍정적 (예: 운동 자주 함=5)
                         if (val === 1) statusColor = "#ef4444"; // Red
                         else if (val === (q.options?.length || 5)) statusColor = "#10b981"; // Green
                      }

                      // Yes/No 타입 특이 케이스 처리
                      if (q.type === 'yesno') {
                        if (q.isReverse && val === 2) statusColor = "#ef4444"; // "질환 있음" -> Red
                        else if (!q.isReverse && val === 1) statusColor = "#ef4444"; // "예방접종 안함" -> Red
                        else statusColor = "#3b82f6"; // 그 외 Blue
                      }

                      return (
                        <ItemRow key={q.id}>
                          <QuestionBox>
                            <QCategoryLabel>{q.category}</QCategoryLabel>
                            <QuestionText>{q.question}</QuestionText>
                          </QuestionBox>

                          <AnswerBox>
                            {/* Yes/No 타입 */}
                            {q.type === "yesno" && (
                              <Badge $color={statusColor} $bgOpacity={0.1}>
                                {label}
                              </Badge>
                            )}

                            {/* 척도/선택형 타입 */}
                            {(q.type === "scale" || q.type === "select") && (
                              <ScaleWrapper>
                                <ValueText $color={statusColor}>{label}</ValueText>
                                <MiniBar value={val} max={q.options?.length || 5} color={statusColor} />
                              </ScaleWrapper>
                            )}
                          </AnswerBox>
                        </ItemRow>
                      );
                    })}
                  </SectionContent>
                </SectionCard>
              );
            })}
          </SectionsContainer>

          <FooterBtnGroup>
            {!readOnly ? (
              <RestartBtn onClick={onRestart}>↺ 처음으로 돌아가기</RestartBtn>
            ) : (
              <RestartBtn onClick={() => router.push("/history")}>목록으로</RestartBtn>
            )}
          </FooterBtnGroup>
        </DashboardColumn>

        {/* [RIGHT] AI 분석 (Sticky) */}
        <ChatColumn>
          <StickyChatWrapper>
            <GeminiChat
              result={result}
              messages={messages}
              setMessages={setMessages}
              readOnly={readOnly}
            />
          </StickyChatWrapper>
        </ChatColumn>
      </ContentWrapper>
    </PageLayout>
  );
}

// ----------------------------------------------------------------------
// Styled Components
// ----------------------------------------------------------------------

const PageLayout = styled(motion.div)`
  width: 100%; height: 100%; display: flex; justify-content: center; 
  padding: 30px; background: #f1f5f9; overflow: hidden;
`;

const ContentWrapper = styled.div`
  display: flex; width: 100%; max-width: 1600px; height: 100%; gap: 30px;
  @media (max-width: 1100px) { flex-direction: column; overflow-y: auto; }
`;

const DashboardColumn = styled.div`
  flex: 2; overflow-y: auto; padding-right: 12px;
  /* 스크롤바 커스텀 */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;

const ChatColumn = styled.div`
  flex: 1; min-width: 400px; height: 100%;
  @media (max-width: 1100px) { height: 600px; flex: none; }
`;
const StickyChatWrapper = styled.div` position: sticky; top: 0; height: 100%; `;

// 헤더
const DashboardHeader = styled.div`
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 24px; padding: 0 4px;
`;
const TitleArea = styled.div` display: flex; flex-direction: column; gap: 4px; `;
const MainTitle = styled.h1` font-size: 26px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px; `;
const Highlight = styled.span` color: #2563eb; `;
const SubDesc = styled.span` font-size: 14px; color: #64748b; font-weight: 500; `;

const SaveBadge = styled.button`
  padding: 8px 16px; background: #1e293b; color: white; border-radius: 8px;
  font-size: 13px; font-weight: 600; border: none; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  &:hover { background: #334155; transform: translateY(-1px); }
`;

// 섹션 컨테이너
const SectionsContainer = styled.div`
  display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px;
`;

const SectionCard = styled(motion.div)`
  background: white; border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
`;

const SectionHeader = styled.div`
  padding: 20px 24px; display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid #f1f5f9; background: #fff;
`;
const IconBox = styled.div`
  width: 36px; height: 36px; background: #eff6ff; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
`;
const SectionTitle = styled.h3` font-size: 17px; font-weight: 700; color: #334155; margin: 0; `;

const SectionContent = styled.div`
  padding: 0 24px;
`;

const ItemRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; gap: 20px;
  padding: 16px 0;
  border-bottom: 1px solid #f8fafc;
  
  &:last-child { border-bottom: none; }
  
  @media (max-width: 600px) { flex-direction: column; align-items: flex-start; gap: 12px; }
`;

const QuestionBox = styled.div` flex: 1; `;
const QCategoryLabel = styled.span`
  display: inline-block; font-size: 11px; font-weight: 600; color: #94a3b8;
  margin-bottom: 4px; background: #f8fafc; padding: 2px 6px; border-radius: 4px;
`;
const QuestionText = styled.div`
  font-size: 15px; color: #475569; line-height: 1.5; font-weight: 500; word-break: keep-all;
`;

const AnswerBox = styled.div`
  display: flex; align-items: center; justify-content: flex-end; min-width: 140px;
  @media (max-width: 600px) { width: 100%; justify-content: flex-start; }
`;

// 시각화 요소
const ScaleWrapper = styled.div`
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
  @media (max-width: 600px) { align-items: flex-start; width: 100%; }
`;

const BarContainer = styled.div` width: 80px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; `;
const BarFill = styled(motion.div)<{ $color: string }>` height: 100%; background: ${({ $color }) => $color}; border-radius: 3px; `;
const ValueText = styled.span<{ $color: string }>` font-size: 14px; font-weight: 700; color: ${({ $color }) => $color}; `;

const Badge = styled.span<{ $color: string; $bgOpacity: number }>`
  padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600;
  background: ${({ $color, $bgOpacity }) => `rgba(${hexToRgb($color)}, ${$bgOpacity})`};
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

const FooterBtnGroup = styled.div` margin-top: 10px; text-align: center; margin-bottom: 40px;`;
const RestartBtn = styled.button`
  padding: 12px 24px; background: white; border: 1px solid #cbd5e1; color: #64748b;
  border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: 0.2s;
  &:hover { background: #f8fafc; color: #334155; border-color: #94a3b8; }
`;

// Helper for hex opacity
function hexToRgb(hex: string) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}