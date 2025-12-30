"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { SurveyResult, generateHealthReport } from "@/utils/survey-summary";

interface Props {
  result: SurveyResult;
  userName?: string;
}

export default function DoctorSummaryReport({ result, userName = "환자" }: Props) {
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // 🤖 Gemini API 호출 (3줄 요약)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const rawReport = generateHealthReport(result);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // ✅ route.ts에서 감지하는 트리거 키워드 포함
            message: "의사가 빠르게 파악할 수 있도록 3줄로 핵심만 요약해줘.",
            history: [],
            context: rawReport,
          }),
        });
        const data = await res.json();
        if (data.text) setAiSummary(data.text);
      } catch (error) {
        setAiSummary("요약 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (result) fetchSummary();
  }, [result]);

  // (데이터 매핑 로직은 실제 문진표 인덱스에 맞춰 수정 필요)
  // 여기서는 UI 구성을 위해 예시 데이터로 렌더링합니다.

  return (
    <ReportCard initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      {/* 🟦 헤더 */}
      <Header>
        <Title>📋 문진 요약 보고서</Title>
        <PatientName>수진자: {userName}</PatientName>
      </Header>

      <ContentBody>
        <TopRow>
          {/* 1. 기저질환 및 가족력 */}
          <SectionBox>
            <SectionTitle>1. 기저질환 및 가족력</SectionTitle>
            <SectionContent>
              <InfoRow>
                <Icon>❤️</Icon>
                <TextCol>
                  <Label>기저질환</Label>
                  <Value className="safe">[없음] ✅</Value>
                </TextCol>
              </InfoRow>
              <InfoRow $bg>
                <Icon>👨‍👩‍👧‍👦</Icon>
                <TextCol>
                  <Label>가족력</Label>
                  <Value className="warn">[있음]</Value>
                  <SubText>→ 직계 가족 중 [고혈압] 병력이 있음.</SubText>
                </TextCol>
              </InfoRow>
              <InfoRow>
                <Icon>🦠</Icon>
                <TextCol>
                  <Label>B형간염 바이러스</Label>
                  <Value>[보유 안함]</Value>
                </TextCol>
              </InfoRow>
            </SectionContent>
          </SectionBox>

          {/* 2. 주요 생활습관 */}
          <SectionBox>
            <SectionTitle>2. 주요 생활습관 및 건강위험 요약</SectionTitle>
            <SectionContent>
              <InfoRow>
                <Icon>🚭</Icon>
                <TextCol>
                  <Label>흡연 상태</Label>
                  <SubText>일반/전자담배: [모두 없음]</SubText>
                </TextCol>
              </InfoRow>
              <InfoRow>
                <Icon>🍺</Icon>
                <TextCol>
                  <Label>음주 습관</Label>
                  <List>
                    <li>빈도: [월 3회]</li>
                    <li>평균: [소주 3잔], 최대: [소주 1병]</li>
                  </List>
                </TextCol>
              </InfoRow>
              <InfoRow>
                <Icon>🏃</Icon>
                <TextCol>
                  <Label>신체활동(운동)</Label>
                  <List>
                    <li>고강도: 주 [2일] (1시간)</li>
                    <li>중강도: 주 [5일] (30분)</li>
                  </List>
                </TextCol>
              </InfoRow>
            </SectionContent>
          </SectionBox>
        </TopRow>

        {/* 3. AI 요약 (하단) */}
        <SummaryBox>
          <SummaryTitle>[ 요약 ]</SummaryTitle>
          <SummaryText>
            {loading ? (
              <LoadingDots>AI가 문진 결과를 분석 중입니다...</LoadingDots>
            ) : (
              <Markdown>{aiSummary}</Markdown>
            )}
          </SummaryText>
        </SummaryBox>
      </ContentBody>
    </ReportCard>
  );
}

// --- 스타일 ---
const ReportCard = styled(motion.div)`
  width: 100%; max-width: 900px; background: white;
  border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1); margin: 0 auto;
`;
const Header = styled.div`
  background: #2563eb; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; color: white;
`;
const Title = styled.h2` font-size: 18px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; color: white; `;
const PatientName = styled.span` font-size: 14px; font-weight: 500; opacity: 0.9; `;

const ContentBody = styled.div` padding: 24px; background: #f8fafc; display: flex; flex-direction: column; gap: 20px; `;
const TopRow = styled.div` display: flex; gap: 20px; @media(max-width: 768px) { flex-direction: column; } `;

const SectionBox = styled.div`
  flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
`;
const SectionTitle = styled.div`
  background: #eff6ff; padding: 10px 16px; font-size: 15px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0;
`;
const SectionContent = styled.div` padding: 16px; display: flex; flex-direction: column; gap: 12px; `;

const InfoRow = styled.div<{ $bg?: boolean }>`
  display: flex; gap: 12px; padding: 8px; border-radius: 6px;
  background: ${({ $bg }) => ($bg ? "#fff7ed" : "transparent")}; /* 강조 필요시 배경색 */
`;
const Icon = styled.div` font-size: 20px; width: 24px; text-align: center; `;
const TextCol = styled.div` flex: 1; display: flex; flex-direction: column; `;
const Label = styled.div` font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 2px; `;
const Value = styled.div`
  font-size: 14px; font-weight: 600; color: #334155;
  &.safe { color: #16a34a; }
  &.warn { color: #ea580c; }
`;
const SubText = styled.div` font-size: 13px; color: #64748b; margin-top: 2px; `;
const List = styled.ul` margin: 2px 0 0 0; padding-left: 0; list-style: none; li { font-size: 13px; color: #64748b; } li::before { content: "- "; } `;

const SummaryBox = styled.div`
  background: white; border: 2px solid #93c5fd; border-radius: 8px; padding: 16px 20px;
`;
const SummaryTitle = styled.div` font-size: 15px; font-weight: 800; color: #1d4ed8; margin-bottom: 8px; `;
const SummaryText = styled.div` font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; `;
const LoadingDots = styled.div` color: #94a3b8; font-style: italic; `;
const Markdown = styled.div``;