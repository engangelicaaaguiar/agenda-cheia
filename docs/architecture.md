# Arquitetura - DutyMD

## VisÃ£o Geral
Middleware API-First para sincronizaÃ§Ã£o bidirecional de agendas mÃ©dicas (Google Calendar, Microsoft Calendar e PEPs de clÃ­nicas).

## Macrocomponentes
- **core-api**: Centraliza autenticaÃ§Ã£o, orquestraÃ§Ã£o e lÃ³gica de negÃ³cios.
- **sync-engine**: ResponsÃ¡vel pela sincronizaÃ§Ã£o bidirecional com calendÃ¡rios e PEPs.
- **auth-service**: Gerencia login OAuth2 (mÃ©dico, clÃ­nica e admin).
- **dispute-service**: MÃ³dulo de mediaÃ§Ã£o e logs de ocorrÃªncias.

## Stack TÃ©cnica
- Backend: Node.js (NestJS ou Fastify)
- Frontend: React (Next.js) e React Native
- Banco: PostgreSQL (via Supabase)
- Mensageria: RabbitMQ ou Kafka (para eventos)
- Infra: Docker + Terraform + AWS

