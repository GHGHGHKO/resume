---
title: "Datadog MCP 연동 가이드"
description: "Claude Code에서 Datadog MCP를 연동해 자연어로 로그·메트릭·배포 상태를 조회하는 방법을 정리했습니다."
publishDate: "2026-03-06"
tags: ["claude", "mcp", "datadog", "devops", "ai"]
---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 도구 | Datadog MCP (Model Context Protocol) |
| 목적 | Claude Code에서 Datadog 모니터링 데이터 조회 |
| 적용 범위 | 전역 (모든 디렉터리에서 사용 가능) |
| 설정 파일 | `~/.claude.json` |

---

## 2. 연동 방법

Claude Code의 MCP 서버는 `~/.claude.json` 파일에서 관리됩니다.
특정 프로젝트에만 등록하면 해당 디렉터리에서만 사용 가능하고,
최상위 `mcpServers`에 등록하면 **모든 디렉터리에서 전역으로 사용** 가능합니다.

### 설정 위치

```
~/.claude.json
└── mcpServers       ← 전역 MCP 서버 설정
    ├── postgres
    ├── datadog      ← 여기에 추가
    └── mcp-atlassian
```

### 설정 예시 (`~/.claude.json`)

```json
"mcpServers": {
  "datadog": {
    "type": "http",
    "url": "https://mcp.datadoghq.com/api/unstable/mcp-server/mcp",
    "headers": {
      "DD-API-KEY": "<DD_API_KEY>",
      "DD-APPLICATION-KEY": "<DD_APPLICATION_KEY>"
    }
  }
}
```

> API Key와 Application Key는 Datadog 콘솔 → Organization Settings → API Keys / Application Keys에서 발급합니다.

---

## 3. 사용 가능한 주요 기능

| 기능 | 도구명 | 설명 |
|------|--------|------|
| 로그 검색 | `search_datadog_logs` | 서비스/환경별 로그 조회 |
| 로그 분석 | `analyze_datadog_logs` | SQL로 로그 집계/분석 |
| 메트릭 조회 | `get_datadog_metric` | 시계열 메트릭 데이터 조회 |
| 메트릭 컨텍스트 | `get_datadog_metric_context` | 메트릭 메타데이터 및 태그 확인 |
| 메트릭 검색 | `search_datadog_metrics` | 사용 가능한 메트릭 목록 조회 |
| 서비스 조회 | `search_datadog_services` | 등록된 서비스 목록 조회 |
| 호스트 조회 | `search_datadog_hosts` | SQL로 호스트 인벤토리 조회 |
| 이벤트 검색 | `search_datadog_events` | 이벤트 로그 조회 |
| 모니터 검색 | `search_datadog_monitors` | 모니터 알림 상태 조회 |
| 인시던트 조회 | `search_datadog_incidents` | 인시던트 목록 조회 |
| 트레이스 조회 | `get_datadog_trace` | APM 트레이스 상세 조회 |
| 스팬 검색 | `search_datadog_spans` | APM 스팬 검색 |

---

## 4. 사용 예시 — Kubernetes 배포 상태 확인

### 질의 예시

```
datadog mcp를 사용하여 my-cluster의 my-service 배포 상태를 확인해줘
```

### 조회 메트릭

```
kubernetes_state.deployment.replicas_available
kubernetes_state.deployment.replicas_desired
kubernetes_state.deployment.replicas_unavailable
kubernetes_state.deployment.replicas_updated
```

### 쿼리 예시

```
sum:kubernetes_state.deployment.replicas_available{
  kube_cluster_name:my-cluster,
  kube_deployment:my-service-deployment
}
```

### 결과 예시

| 항목 | 값 |
|------|----|
| Desired Replicas | 2 |
| Available Replicas | 2 |
| Updated Replicas | 2 |
| Unavailable Replicas | 0 |

> Unavailable = 0 → 정상 운영 중

---

## 5. 주의사항

- Kubernetes 배포명 태그는 `kube_deployment`이며, 실제 값은 `<서비스명>-deployment` 형태일 수 있음
  - `get_datadog_metric_context` 도구로 실제 태그 값을 먼저 확인 후 메트릭 쿼리 권장
- MCP 설정 변경 후 **다음 Claude Code 세션부터** 적용됨
- `~/.claude.json`에는 API Key가 평문으로 저장되므로 파일 권한(`600`) 설정 권장

---

## 6. 참고

- [Datadog MCP 공식 문서](https://docs.datadoghq.com/bits_ai/mcp_server/setup/)
