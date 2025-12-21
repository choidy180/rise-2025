"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getHealthRecords, HealthRecord, formatDate } from "@/utils/storage";
import Navigation from "@/components/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setRecords(getHealthRecords());
  }, []);

  // 검색 필터링 (이름 또는 날짜)
  const filteredRecords = records.filter(
    (r) =>
      r.name.includes(searchTerm) ||
      formatDate(r.date).includes(searchTerm)
  );

  return (
    <Container>
      <Navigation />
      <Content>
        <Header>
          <Title>📂 문진 기록 보관함</Title>
          <SubTitle>저장된 건강 문진 내역을 확인하세요.</SubTitle>
        </Header>

        <SearchArea>
          <SearchInput
            placeholder="이름 또는 날짜(2025. 12...)로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchIcon>🔍</SearchIcon>
        </SearchArea>

        <ListGrid>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record, idx) => (
              <RecordCard
                key={record.id}
                onClick={() => router.push(`/history/${record.id}`)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <CardTop>
                  <NameBadge>{record.name}</NameBadge>
                  <DateText>{formatDate(record.date)}</DateText>
                </CardTop>
                <SummaryText>{record.summary || "요약 정보 없음"}</SummaryText>
                <CardFooter>
                  <ChatCount>💬 대화 {record.chatHistory.length}건</ChatCount>
                  <ViewBtn>상세보기 →</ViewBtn>
                </CardFooter>
              </RecordCard>
            ))
          ) : (
            <EmptyState>
              <EmptyIcon>📭</EmptyIcon>
              <p>저장된 기록이 없거나 검색 결과가 없습니다.</p>
            </EmptyState>
          )}
        </ListGrid>
      </Content>
    </Container>
  );
}

// --- Styles ---
const Container = styled.div` width: 100%; min-height: 100vh; background-color: #f1f5f9; display: flex; flex-direction: column; align-items: center; `;
const Content = styled.div` width: 100%; max-width: 800px; padding: 40px 20px; margin-top: 60px; `;
const Header = styled.div` margin-bottom: 30px; text-align: center; `;
const Title = styled.h1` font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 8px; `;
const SubTitle = styled.p` font-size: 15px; color: #64748b; `;

const SearchArea = styled.div` position: relative; margin-bottom: 40px; `;
const SearchInput = styled.input` width: 100%; padding: 16px 20px; padding-right: 50px; font-size: 16px; border: 1px solid #e2e8f0; border-radius: 16px; outline: none; transition: 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.03); &:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); } `;
const SearchIcon = styled.span` position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 20px; color: #94a3b8; `;

const ListGrid = styled.div` display: flex; flex-direction: column; gap: 16px; `;

const RecordCard = styled(motion.div)` background: white; padding: 24px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #fff; cursor: pointer; transition: 0.2s; &:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.1); border-color: #e0e7ff; } `;
const CardTop = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; `;
const NameBadge = styled.span` font-size: 18px; font-weight: 700; color: #1e293b; `;
const DateText = styled.span` font-size: 13px; color: #94a3b8; `;
const SummaryText = styled.p` font-size: 15px; color: #475569; margin-bottom: 20px; line-height: 1.5; `;
const CardFooter = styled.div` display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 16px; `;
const ChatCount = styled.span` font-size: 13px; color: #64748b; font-weight: 500; `;
const ViewBtn = styled.span` font-size: 14px; color: #3b82f6; font-weight: 700; `;

const EmptyState = styled.div` text-align: center; padding: 60px 0; color: #94a3b8; `;
const EmptyIcon = styled.div` font-size: 40px; margin-bottom: 16px; opacity: 0.5; `;