# Arquitetura - Agenda Cheia

## Visão Geral
Middleware API-First para sincronização bidirecional de agendas médicas (Google Calendar, Microsoft Calendar e PEPs de clínicas).

## Macrocomponentes
- **core-api**: Centraliza autenticação, orquestração e lógica de negócios.
- **sync-engine**: Responsável pela sincronização bidirecional com calendários e PEPs.
- **auth-service**: Gerencia login OAuth2 (médico, clínica e admin).
- **dispute-service**: Módulo de mediação e logs de ocorrências.

## Stack Técnica
- Backend: Node.js (NestJS ou Fastify)
- Frontend: React (Next.js) e React Native
- Banco: PostgreSQL (via Supabase)
- Mensageria: RabbitMQ ou Kafka (para eventos)
- Infra: Docker + Terraform + AWS
