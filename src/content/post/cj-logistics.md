---
title: '대한통운 API 연동 및 장애 대응'
description: '대한통운 배송조회 API Timeout 장애를 분석·대응하고, Redis+DB 이중화 인증 토큰 관리로 캐시 장애에도 서비스 무중단 운영 구조를 만들었습니다.'
publishDate: '2021-10-01'
tags: ['java', 'redis', 'oracle', 'spring-boot', 'resilience']
---

## 개요

GS네트웍스에서 대한통운 외부 API 연동을 담당하며, 운영 중 발생한 장애를 분석·해결하고 캐시 장애 대비 이중화 구조를 구축했습니다.

- **회사**: GS네트웍스 / 생활플랫폼팀
- **기간**: 2021.10 – 2022.01
- **역할**: 외부 연동 담당, 장애 대응, 안정성 개선
- **스택**: Java, REST API, Redis, Oracle

---

## 배경

대한통운 배송조회 API와 연동된 서비스에서 간헐적 Timeout 장애가 발생했습니다.
원인 분석 없이 재시도만 반복하는 방식은 근본적인 해결이 되지 않았고,
인증 토큰을 Redis에서만 관리하다 보니 캐시 장애 시 서비스 전체가 영향을 받는 구조적 취약점도 있었습니다.

---

## 주요 기여

### 1. 배송조회 API Timeout 장애 분석 및 대응

간헐적으로 발생하는 Timeout의 원인을 분석하고, 레거시 API를 Open API로 전환해 해결했습니다.

- 로그 분석을 통해 특정 조건에서 응답 지연이 반복됨을 확인
- 대한통운 측과 협의 후 레거시 API 버전업 및 Open API로 전환
- 전환 후 Timeout 발생 빈도 감소 확인

### 2. 인증 토큰 Redis + DB 이중화

Redis 단독 관리에서 Redis + DB 이중화 구조로 변경해, 캐시 장애 시에도 서비스가 중단되지 않도록 만들었습니다.

```
[인증 토큰 조회 흐름]

1. Redis 조회 시도
   ├── 캐시 Hit → 토큰 반환
   └── 캐시 Miss or Redis 장애
          │
          ▼
       2. DB 조회 (Fallback)
          └── 토큰 반환 후 Redis 재적재
```

- `@Recover` 어노테이션으로 Redis 장애 시 DB 조회로 자동 전환
- Redis 복구 후에는 다음 요청 시 자연스럽게 캐시 재적재

```java
@Retryable(value = RedisException.class, maxAttempts = 2)
public String getTokenFromCache(String key) {
    return redisTemplate.opsForValue().get(key);
}

@Recover
public String getTokenFromDb(RedisException e, String key) {
    return tokenRepository.findByKey(key);
}
```

### 3. API 버전 업 협의 및 레거시 전환

대한통운 담당자와 직접 협의해 API 버전 업 일정과 마이그레이션 방안을 조율했습니다.

- 레거시 API 종료 일정에 맞춰 순차적으로 Open API로 전환
- 전환 기간 동안 양쪽 API를 병렬 운영해 안정성을 확보

---

## 결과

- Timeout 장애 원인 파악 및 Open API 전환으로 재발 방지
- Redis + DB 이중화로 캐시 장애에도 서비스 무중단 운영 달성
- 외부 API 업체와의 협의·전환 프로세스 경험 축적

---

## 회고

외부 API 장애는 내부 코드를 아무리 잘 짜도 통제할 수 없는 변수가 있다는 것을 배웠습니다.
중요한 것은 장애가 발생했을 때 "서비스가 멈추지 않는 구조"를 미리 만들어두는 것이었습니다.
Redis + DB 이중화처럼 Fallback을 설계해두는 습관이 이때부터 자연스럽게 생겼습니다.
