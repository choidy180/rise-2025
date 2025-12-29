"use client";

import Image from "next/image";
import styled from "styled-components";
import LogoImage from "@/public/logo/logo-ai.png";
import { useProgressStore } from "@/store/progress-stage";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

const Navigation = () => {
  const { status, user, login, logout } = useAuthStore();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({ id: crypto.randomUUID(), name: '김민석' });
  }


  return (
    <Container role="navigation" aria-label="Global">
      <Image src={LogoImage} style={{ cursor: "pointer" }} width={240} height={48} alt="ADHD-DIAGNOSIS" priority onClick={()=> router.push('/')}/>

      <BtnBox>
        {status === "unauth" && (
          <>
            {/* <BtnVariantGhost
              type="button"
              onClick={handleLogin}
              aria-label="로그인"
            >
              로그인
            </BtnVariantGhost>

            <BtnVariantPrimary
              type="button"
              onClick={() => router.replace('/join')}
              aria-label="회원가입"
            >
              회원가입
            </BtnVariantPrimary> */}
          </>
        )}

        {/* {status === "auth" && (
          <BtnVariantDanger type="button" onClick={logout} aria-label="로그아웃">
            로그아웃
          </BtnVariantDanger>
        )} */}
      </BtnBox>
    </Container>
  );
};

export default Navigation;

/* ====================== styled ====================== */
const Container = styled.div`
  position: fixed; /* absolute → fixed 권장 (헤더는 보통 fixed) */
  top: 0; 
  left: 0;
  z-index: 9999;   /* 충분히 크게 */

  width: 100%;
  max-height: 72px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  background: #ffffff;
  padding: 6px 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  pointer-events: auto;
`;

const BtnBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StateText = styled.span`
  display: inline-block;
  font-size: 0.9rem;
  color: #4b5563;
  margin-right: 4px;
`;

const ButtonBase = styled.button`
  appearance: none;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.06s ease;

  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const BtnVariantGhost = styled(ButtonBase)`
  color: #6366f1;
  background: #ffffff;
  border-color: #6366f1;
  &:hover {
    background: #eef2ff;
  }
`;

const BtnVariantPrimary = styled(ButtonBase)`
  color: #ffffff;
  background: #6366f1;
  border-color: #6366f1;
  &:hover {
    background: #4f46e5;
    border-color: #4f46e5;
  }
`;

const BtnVariantDanger = styled(ButtonBase)`
  color: #ffffff;
  background: #ef4444;
  border-color: #ef4444;
  &:hover {
    background: #dc2626;
    border-color: #dc2626;
  }
`;
