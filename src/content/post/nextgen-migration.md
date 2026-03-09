---
title: 'IDC → IDC 차세대 이관 (배치 개선)'
description: 'Scheduled 기반 배치를 Airflow(MWAA)와 KubernetesPodOperator 구조로 전환해 무중단 배포와 메모리 누수 개선으로 운영을 안정화했습니다.'
publishDate: '2021-08-01'
tags: ['java', 'aws', 'airflow', 'kubernetes', 'spring-batch', 'python']
---

## 개요

GS네트웍스 차세대 전환 프로젝트에서 기존 Scheduled 기반 배치를 Airflow(MWAA)와 Kubernetes 기반 구조로 전환했습니다.
차세대 오픈 이후 안정화 단계에서 API/배치 장애를 분석·해결하며 운영 안정화에 기여했습니다.

- **회사**: GS네트웍스 / 생활플랫폼팀
- **기간**: 2021.08 – 2022.06
- **역할**: 배치 아키텍처 개선, 장애 대응, 문서화
- **스택**: Java, Spring Batch, Kubernetes, Airflow(MWAA), Python

---

## 배경

기존 배치는 Spring의 `@Scheduled` 어노테이션 기반으로 애플리케이션 내에 내장된 방식이었습니다.
이 방식은 배치 실행 중 애플리케이션 재배포가 불가능했고, 실행 이력·실패 추적이 어려웠습니다.
차세대 전환을 기회로 배치 구조를 개선하고자 Airflow(MWAA) 기반으로 전환하는 방안을 제안했습니다.

---

## 주요 기여

### 1. Airflow(MWAA) 기반 전환 및 무중단 배포 구현

`@Scheduled` 기반 배치를 Airflow(MWAA)로 전환해 무중단 배포 흐름을 구성했습니다.

**전환 전:**

```
[Application Pod]
  └── @Scheduled 배치 실행 중
        └── 재배포 → 배치 중단 위험
```

**전환 후:**

```
[Airflow DAG 트리거]
    │
    ▼
[KubernetesPodOperator]
    │ Job Pod 생성
    ▼
[Spring Batch Job 실행]
    └── 완료 후 Pod 종료
```

- 배치 실행이 독립된 Pod에서 이루어지므로, 애플리케이션 재배포 시 실행 중인 배치에 영향 없음
- Airflow DAG에서 실행 이력, 성공/실패 여부, 소요 시간을 한눈에 확인 가능

### 2. KubernetesPodOperator 도입 제안

기존 Airflow LocalExecutor 방식 대신, KubernetesPodOperator를 활용해 배치를 Job 단위로 실행하는 방식을 제안했습니다.

- 각 배치 Job이 독립된 Pod에서 실행되어 리소스 격리가 가능
- 특정 배치 실패가 다른 배치에 영향을 주지 않음
- Pod 자동 삭제로 리소스 낭비 없음

### 3. 차세대 오픈 이후 장애 분석·해결

차세대 오픈 이후 발생한 API/배치 장애를 분석하고 해결하며 운영 안정화에 기여했습니다.

- 오픈 초기 간헐적 장애 패턴을 로그로 추적해 원인 파악
- 긴급 핫픽스와 구조적 개선을 병행

### 4. 문서화 및 메모리 누수 개선

문서 없이 운영 중이던 API를 문서화하고, 코드 리뷰 중 발견한 메모리 누수를 개선했습니다.

```java
// Before: Stream을 명시적으로 닫지 않아 메모리 누수 위험
InputStream is = connection.getInputStream();
// ... 처리
is.close(); // finally 블록이 없어 예외 시 닫히지 않음

// After: try-with-resources로 자동 닫힘 보장
try (InputStream is = connection.getInputStream()) {
    // ... 처리
}
```

- `try-with-resources`를 적용해 예외 발생 시에도 리소스가 정상적으로 해제되도록 개선

---

## 결과

- Airflow + KubernetesPodOperator 구조로 배치 무중단 배포 달성
- 배치 실행 이력·실패 추적 가능 구조 확보
- 문서화로 운영 인수인계 용이성 향상
- 메모리 누수 개선으로 장기 운영 안정성 확보

---

## 회고

KubernetesPodOperator 도입을 처음 제안했을 때, 기존 방식보다 복잡해 보인다는 우려가 있었습니다.
하지만 배치 격리와 무중단 배포라는 이점이 분명했고, 운영에 들어간 이후 실제로 그 효과를 확인할 수 있었습니다.
차세대 오픈 이후 문서 없는 코드를 파악하며 수정하는 경험은, 이후에는 "나 다음 사람이 이 코드를 읽을 수 있는가"를 항상 생각하게 된 계기가 됐습니다.
