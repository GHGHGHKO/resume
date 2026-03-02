---
title: "IDC → AWS 이관"
description: "물류 서비스 5개를 IDC에서 AWS로 이관했습니다. Oracle에서 ANSI SQL 전환, MWAA CI/CD 자동화로 수동 배포 부담과 운영 중단 위험을 낮췄습니다."
publishDate: "2023-03-01"
tags: ["aws", "airflow", "sql", "ci-cd", "java", "python"]
---

## 개요

기존 IDC 환경에서 AWS로 물류 서비스를 이관하는 프로젝트에 참여했습니다.
데이터베이스 쿼리 전환, MWAA(Airflow) CI/CD 자동화, 운영 중단 없는 점진적 전환을 목표로 진행했습니다.

- **회사**: GS리테일 / 물류DX팀
- **기간**: 2023.03 – 2024.02
- **역할**: MWAA 구성, Oracle SQL → ANSI SQL 전환, CI/CD 자동화
- **스택**: Java, Python, SQL, MWAA(Airflow), CI/CD

---

## 배경

IDC 환경은 하드웨어 노후화, 운영비 증가, 배포 절차의 복잡성 등의 문제가 있었습니다.
AWS로 전환하면서 DB도 Oracle에서 Aurora PostgreSQL로 변경됐고, 이에 맞춰 Oracle 전용 SQL 문법을 ANSI SQL로 전환해야 했습니다.
동시에 배포 자동화 수준을 높여 수동 작업과 그로 인한 실수를 줄이는 것이 목표였습니다.

---

## 주요 기여

### 1. MWAA CI/CD 자동화

수동 배포로 인한 실수와 작업 부담을 줄이고자, Airflow API를 활용해 커밋 시 이미지 태그가 자동 갱신되도록 CI/CD 흐름을 구성했습니다.

```
[Git Push / PR Merge]
    │
    ▼
[CI 파이프라인 실행]
    │ 이미지 빌드 + 태그
    ▼
[Airflow API 호출]
    │ DAG 이미지 태그 갱신
    ▼
[MWAA(Airflow)에 자동 반영]
```

- 커밋 → 배포 과정에서 사람이 개입해야 하는 단계를 제거했습니다.
- 이미지 태그 관리 실수로 인한 배포 불일치 문제를 구조적으로 방지했습니다.

### 2. Oracle SQL → ANSI SQL 점진적 전환

5개 서비스의 쿼리를 운영 중단 없이 점진적으로 ANSI SQL로 전환했습니다.

Oracle 전용 문법에서 주로 변환이 필요했던 항목들:

| Oracle 문법 | ANSI SQL 대체 |
|-------------|--------------|
| `ROWNUM` | `LIMIT` / `FETCH FIRST n ROWS` |
| `NVL()` | `COALESCE()` |
| `DECODE()` | `CASE WHEN` |
| `SYSDATE` | `CURRENT_TIMESTAMP` |
| `(+)` 조인 | `LEFT/RIGHT JOIN` |

- 한 번에 전환하지 않고 서비스 단위로 분리해 리스크를 낮췄습니다.
- 각 전환 후 운영 중 쿼리 오류 여부를 모니터링하며 점진적으로 적용했습니다.

---

## 결과

- 5개 서비스 쿼리 전환 완료, 운영 중단 없이 이관 성공
- CI/CD 자동화로 배포 관련 수동 작업 제거
- AWS 전환 이후 운영비 및 장애 대응 부담 경감

---

## 회고

대규모 이관 프로젝트에서 "점진적으로" 진행하는 것의 중요성을 느꼈습니다.
한 번에 전부 바꾸는 것보다 서비스 단위로 나눠서 하나씩 검증하는 방식이 리스크를 훨씬 낮춰줬습니다.
CI/CD 자동화는 초기 구성에 시간이 들지만, 이후 운영 편의성이 크게 높아져 가치가 있었습니다.
