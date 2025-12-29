"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { hashRRN, maskRRN } from "@/lib/rrn";

import { useAuthStore } from "@/store/auth";            // persist된 auth(권장)
import { useProgressStore } from "@/store/progress-stage"; // 진행도

export default function LoginRrnBox() {
  const [name, setName] = useState("");
  const [rrn, setRrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { login } = useAuthStore();
  const { setProgress } = useProgressStore();

  // 주민번호 입력 시 자동 하이픈
  const handleRrnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    const formatted =
      digits.length <= 6 ? digits : `${digits.slice(0, 6)}-${digits.slice(6)}`;
    setRrn(formatted);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    try {
      setLoading(true);

      // 1) rrn 해시 생성 (서버에서 하는 게 이상적이지만, 여기선 데모로 클라에서 처리)
      const rrnHash = await hashRRN(rrn);

      // 2) Firestore에서 rrnHash + username 매칭
      //    (컬렉션 구조는 회원가입 시 저장한 "users/{uid}" 기반)
      const q = query(
        collection(db, "users"),
        where("username", "==", name.trim()),
        where("rrnHash", "==", rrnHash),
        limit(1)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setErr("일치하는 사용자가 없습니다. 이름 또는 주민등록번호를 확인하세요.");
        return;
      }

      const docSnap = snap.docs[0];
      const userData = docSnap.data();

      // 3) “앱 내부 로그인” 처리 (Firebase Auth와 별개)
      login({
        id: docSnap.id,
        name: userData.username,
      });

      // 4) UI 전역 상태(선택): 기존 store와도 동기화
      setProgress(1);

      // 5) UX 메시지
      alert(`환영합니다, ${userData.username}님! (${maskRRN(rrn)})`);
    } catch (e: any) {
      console.error(e);
      setErr("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContainerBox>
      <Container>
        <form onSubmit={onSubmit}>
          <h4>로그인</h4>

          <div>
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              placeholder="최대 10글자"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="rrn">주민등록번호</label>
            <input
              id="rrn"
              type="text"
              placeholder="######-#######"
              value={rrn}
              onChange={handleRrnChange}
              maxLength={14}
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </div>

          {err && <Msg role="alert">{err}</Msg>}

          <button className="submit-btn" type="submit">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </Container>
    </ContainerBox>
  );
}

const ContainerBox = styled.div`
  width: 100vw;
  min-height: 100vh;

  display: flex;
  justify-content: center;
  align-items: center;
`
/* ---------------- styled (회원가입 폼과 동일 무드) ---------------- */
const Container = styled.div`
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  padding: 1.8rem 2rem;

  display: flex;
  justify-content: center;
  form {
    width: 100%;
  }

  h4 {
    font-size: 1.6rem;
    color: #4f46e5;
    margin: 0 0 1.2rem;
    text-align: center;
  }

  label {
    display: block;
    margin-top: 20px;
    font-weight: 600;
    font-size: 0.9rem;
    color: #111827;
  }

  input {
    width: 100%;
    padding: 0.6rem 0.8rem;
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    margin-top: 4px;
    color: #111827;
    background: #fff;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;

    &::placeholder {
      color: #9ca3af;
    }
    &:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    &[aria-invalid="true"] {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }
  }

  .submit-btn {
    width: 100%;
    margin-top: 1.2rem;
    padding: 0.8rem;
    font-size: 1rem;
    border: none;
    border-radius: 10px;
    background: #4f46e5;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease;

    &:hover {
      background: #4338ca;
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
`;

const Msg = styled.p`
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
`;
