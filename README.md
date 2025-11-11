# agenda-cheia
“Ser a fonte única e confiável de disponibilidade de médicos verificados, sincronizando em tempo real agendas pessoais, plataformas de telemedicina e PEPs das clínicas, eliminando conflitos de horário e maximizando o aproveitamento da agenda médica.”

mkdir -p apps/{portal-medico,portal-clinica,portal-admin} \
services/{core-api,sync-engine,auth-service,dispute-service} \
infra/{docker,terraform,k8s} \
docs/{api-specs,product,ux-ui/wireframes} \
tests/{unit,integration,e2e}

touch docs/architecture.md
