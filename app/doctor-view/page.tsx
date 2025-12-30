"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
// ✅ HistoryPage와 동일한 유틸리티 사용
import { getHealthRecords, HealthRecord, formatDate } from "@/utils/storage";

export default function DoctorDashboard() {
  const router = useRouter();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ 1. 데이터 불러오기 (HistoryPage와 동일 로직)
  useEffect(() => {
    setRecords(getHealthRecords());
  }, []);

  // ✅ 2. 검색 필터링 (이름 또는 날짜)
  const filteredRecords = records.filter(
    (r) =>
      r.name.includes(searchTerm) ||
      formatDate(r.date).includes(searchTerm)
  );

  // ➡️ 상세 페이지 이동 (의사 전용 뷰로 이동)
  const handleRowClick = (id: string) => {
    router.push(`/doctor-view/${id}`);
  };

  return (
    <Container>
      <HeaderSection>
        <TitleGroup>
          <MainTitle>👨‍⚕️ 진료 대기 리스트</MainTitle>
          <SubTitle>접수된 문진 기록을 확인하세요.</SubTitle>
        </TitleGroup>
        
        <SearchBox>
          <SearchIcon>🔍</SearchIcon>
          <SearchInput 
            placeholder="이름 또는 날짜(2025. 12...) 검색" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBox>
      </HeaderSection>

      <TableContainer>
        {/* 테이블 헤더 */}
        <TableHead>
          <Row>
            <Th style={{ width: "120px" }}>접수 일자</Th>
            <Th style={{ width: "100px" }}>이름</Th>
            <Th style={{ flex: 1 }}>주요 요약 (Summary)</Th>
            <Th style={{ width: "100px", textAlign: "center" }}>상세보기</Th>
          </Row>
        </TableHead>

        {/* 테이블 바디 */}
        <TableBody>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record, idx) => (
              <TableRow
                key={record.id}
                onClick={() => handleRowClick(record.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* 📅 날짜 포맷팅 */}
                <Td className="date">{formatDate(record.date)}</Td>
                
                {/* 👤 이름 */}
                <Td className="name">{record.name}</Td>
                
                {/* 📝 요약 내용 (내용이 길면 말줄임표 처리됨) */}
                <Td className="summary">
                  {record.summary || "요약 정보가 없습니다."}
                </Td>
                
                {/* ➡️ 버튼 */}
                <Td style={{ textAlign: "center" }}>
                  <ViewBtn>결과 보기 →</ViewBtn>
                </Td>
              </TableRow>
            ))
          ) : (
            <EmptyState>
              <EmptyIcon>📭</EmptyIcon>
              <p>대기 중인 환자가 없거나 검색 결과가 없습니다.</p>
            </EmptyState>
          )}
        </TableBody>
      </TableContainer>
    </Container>
  );
}

// --- 🎨 Styled Components (의사 전용 UI 스타일) ---

const Container = styled.div`
  max-width: 1200px; margin: 0 auto; padding: 40px 20px;
  background-color: #f8fafc; min-height: 100vh;
`;

const HeaderSection = styled.div`
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 30px;
  @media (max-width: 768px) { flex-direction: column; align-items: flex-start; gap: 20px; }
`;

const TitleGroup = styled.div` display: flex; flex-direction: column; gap: 8px; `;
const MainTitle = styled.h1` font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; `;
const SubTitle = styled.p` font-size: 14px; color: #64748b; margin: 0; `;

const SearchBox = styled.div`
  display: flex; align-items: center; background: white; 
  padding: 10px 16px; border-radius: 12px; border: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02); width: 300px;
  transition: all 0.2s;
  &:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
`;
const SearchIcon = styled.span` font-size: 16px; margin-right: 8px; opacity: 0.5; `;
const SearchInput = styled.input`
  border: none; outline: none; font-size: 14px; width: 100%; color: #334155;
  &::placeholder { color: #94a3b8; }
`;

const TableContainer = styled.div`
  background: white; border-radius: 16px; overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;
`;

const TableHead = styled.div`
  background: #f1f5f9; padding: 0 24px; border-bottom: 1px solid #e2e8f0;
`;
const TableBody = styled.div` padding: 0 12px; `;

const Row = styled.div`
  display: flex; align-items: center; padding: 16px 0; gap: 16px;
`;

const TableRow = styled(motion.div)`
  display: flex; align-items: center; padding: 16px 12px; gap: 16px;
  border-bottom: 1px solid #f8fafc; cursor: pointer; border-radius: 8px; margin: 4px 0;
  transition: background 0.2s;
  
  &:hover { background: #eff6ff; }
  &:last-child { border-bottom: none; }

  .date { color: #64748b; font-size: 13px; font-variant-numeric: tabular-nums; }
  .name { font-weight: 700; color: #1e293b; font-size: 15px; }
  .summary { color: #475569; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const Th = styled.div`
  font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;
`;
const Td = styled.div` overflow: hidden; `;

const ViewBtn = styled.button`
  background: white; border: 1px solid #cbd5e1; color: #475569;
  padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #334155; color: white; border-color: #334155; }
`;

const EmptyState = styled.div`
  padding: 80px 0; text-align: center; color: #94a3b8; font-size: 15px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
`;
const EmptyIcon = styled.div` font-size: 40px; opacity: 0.5; `;