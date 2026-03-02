---
title: "방문택배 API·Batch 구축"
description: "방문택배 서비스 오픈 대비 API·배치 시스템을 구축했습니다. 일 1,000건 처리 목표, 트랜잭션 이벤트 기반 알림톡, Datadog 모니터링 적용."
publishDate: "2024-03-01"
tags: ["java", "spring-batch", "airflow", "datadog", "spring-boot"]
---

## 개요

방문택배 서비스 신규 오픈을 위해 API와 배치 시스템을 처음부터 구축했습니다.
서비스 안정성을 위한 정합성 설계와 운영 모니터링 체계를 함께 만들었습니다.

- **회사**: GS리테일 / 물류DX팀
- **기간**: 2024.03 – 2024.10
- **역할**: API·Batch 개발, 알림톡 발송 흐름 설계, 배치 자원 튜닝
- **스택**: Java, Python, Spring Batch 5, MWAA(Airflow), Datadog

---

## 배경

방문택배는 기존에 없던 신규 서비스로, 오픈 초기부터 일 1,000건 이상의 접수를 안정적으로 처리할 수 있는 구조가 필요했습니다.
택배 접수·상태 변경·알림톡 발송으로 이어지는 흐름에서 데이터 정합성이 깨지지 않도록 설계하는 것이 핵심 과제였습니다.

---

## 주요 기여

### 1. API·배치 흐름 설계

오픈 초기 일 1,000건 접수를 처리할 수 있도록 API와 배치 흐름을 구성했습니다.

```
[고객 접수 API]
    │
    ▼
[DB 저장 + 상태 업데이트]
    │ @TransactionalEventListener(AFTER_COMMIT)
    ▼
[알림톡 발송 이벤트]
    │
    ▼
[MWAA(Airflow) 배치]
    └── 운송장 상태 주기적 갱신
    └── 알림톡 발송 결과 처리
```

### 2. 트랜잭션 이벤트 기반 알림톡 발송

알림톡이 DB 반영 전에 발송되는 문제를 방지하고자, `@TransactionalEventListener(AFTER_COMMIT)`을 적용했습니다.

- DB 커밋이 완료된 이후에만 알림톡 발송 이벤트가 실행되므로, 상태와 알림의 정합성이 보장됩니다.
- 커밋 전 예외가 발생하면 알림톡도 발송되지 않아 일관성이 유지됩니다.

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handleDeliveryStatusChanged(DeliveryStatusChangedEvent event) {
    // DB 커밋 후에만 실행
    kakaoNotificationService.send(event.getCustomerId(), event.getStatus());
}
```

### 3. Datadog 모니터링으로 운송장 추적

운송장 상태별 로그를 Datadog으로 수집해, 누락·이상 구간을 추적할 수 있도록 개선했습니다.

- 운송장 번호 기준으로 상태 전이 이력을 추적할 수 있어, 지연·누락이 발생해도 빠르게 구간을 특정할 수 있습니다.
- 오픈 초기에 발생한 간헐적 이슈를 로그로 빠르게 파악했습니다.

### 4. MWAA(Airflow) 배치 자원 튜닝

초기 배치 실행 지연과 자원 낭비를 줄이고자 DAG 구조와 배치 자원을 튜닝했습니다.

- Task 간 의존 관계를 재정의해 불필요한 대기 시간을 제거
- 자원 할당(executor 설정, concurrency 등)을 조정해 처리 지연을 개선

---

## 결과

- 오픈 당일 일 1,000건 이상 접수 처리 정상 완료
- 알림톡 발송 정합성 문제 없이 운영 중
- 운송장 누락 이슈를 Datadog으로 즉시 탐지·처리

---

## 회고

신규 서비스를 처음부터 설계할 때 가장 신경 쓴 부분은 "정합성"이었습니다.
`AFTER_COMMIT` 이벤트 방식은 구현이 단순하지만, 알림과 데이터가 어긋나는 클래식한 문제를 구조적으로 해결합니다.
배치 자원 튜닝은 처음에는 작은 개선으로 보였지만, 운영 규모가 늘어날수록 효과가 컸습니다.
