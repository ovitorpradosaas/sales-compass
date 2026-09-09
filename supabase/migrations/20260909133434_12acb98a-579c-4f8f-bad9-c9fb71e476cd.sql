create or replace function public.bootstrap_workspace()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  s_novos uuid; s_contatar uuid; s_feito uuid; s_resp uuid; s_qual uuid; s_reuniao uuid; s_prop uuid;
  icp_imob uuid; icp_clin uuid;
  t_quente uuid; t_indicacao uuid; t_alto uuid;
  seq uuid; step1 uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid; p8 uuid;
  c1 uuid; c2 uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid) then return; end if;

  select email into uemail from auth.users where id = uid;
  insert into public.profiles (id, full_name, email) values (uid, split_part(coalesce(uemail,'você'), '@', 1), uemail);

  insert into public.icp_criteria (user_id, key, label, weight, position) values
    (uid,'niche','Nicho correto',20,1),
    (uid,'region','Região correta',15,2),
    (uid,'revenue','Faturamento na faixa',15,3),
    (uid,'instagram','Instagram ativo',10,4),
    (uid,'website','Site próprio',10,5),
    (uid,'employees','Funcionários adequados',10,6),
    (uid,'keyword','Palavra-chave relevante',10,7);

  insert into public.pipeline_stages (user_id,name,color,position) values (uid,'Novos','sky',1) returning id into s_novos;
  insert into public.pipeline_stages (user_id,name,color,position) values (uid,'Contatar','brand',2) returning id into s_contatar;
  insert into public.pipeline_stages (user_id,name,color,position) values (uid,'Contato realizado','brand',3) returning id into s_feito;
  insert into public.pipeline_stages (user_id,name,color,position) values (uid,'Respondeu','butter',4) returning id into s_resp;
  insert into public.pipeline_stages (user_id,name,color,position) values (uid,'Qualificado','mint',5) returning id into s_qual;
  insert into public.pipeline_stages (user_id,name,color,position) values (uid,'Reunião','mint',6) returning id into s_reuniao;
  insert into public.pipeline_stages (user_id,name,color,position) values (uid,'Proposta','blossom',7) returning id into s_prop;
  insert into public.pipeline_stages (user_id,name,color,position) values
    (uid,'Negociação','butter',8),(uid,'Ganho','mint',9),(uid,'Perdido','inkmuted',10);

  insert into public.tags (user_id,name,color) values (uid,'Quente','blossom') returning id into t_quente;
  insert into public.tags (user_id,name,color) values (uid,'Indicação','sky') returning id into t_indicacao;
  insert into public.tags (user_id,name,color) values (uid,'Alto ticket','mint') returning id into t_alto;
  insert into public.tags (user_id,name,color) values (uid,'Frio','inkmuted');

  insert into public.icps (user_id,name,niche,subniche,state,city,regions,revenue_min,revenue_max,employees_min,employees_max,keywords,requires_website,requires_instagram,other_criteria)
  values (uid,'ICP — Imobiliárias de Alto Padrão','Imobiliária','Alto padrão','PR','Curitiba','Batel, Água Verde',1000000,20000000,10,80,array['alto padrão','lançamento','condomínio'],true,true,'Equipe de vendas própria')
  returning id into icp_imob;

  insert into public.icps (user_id,name,niche,subniche,state,city,revenue_min,revenue_max,employees_min,employees_max,keywords,requires_website,requires_instagram)
  values (uid,'ICP — Clínicas Estéticas','Clínica','Estética','SP','São Paulo',500000,8000000,5,40,array['harmonização','estética avançada'],true,true)
  returning id into icp_clin;

  insert into public.prospects (user_id,company,niche,city,state,website,instagram,phone,whatsapp,email,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,potential,notes,source,last_contact_at,next_action,next_action_at)
  values (uid,'Imobiliária Prime','Imobiliária','Curitiba','PR','imobiliariaprime.com.br','@imobiliariaprime','(41) 3333-1010','(41) 99999-1010','contato@imobiliariaprime.com.br','João Silva','Diretor Comercial',38,6500000,icp_imob,94,'respondeu',s_resp,'Alto','Interessado em aumentar leads de lançamentos.','mock',now() - interval '1 day','Responder mensagem no WhatsApp',now() + interval '2 hours')
  returning id into p1;

  insert into public.prospects (user_id,company,niche,city,state,website,instagram,phone,whatsapp,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,potential,source,last_contact_at,next_action,next_action_at)
  values (uid,'Horizonte Imóveis','Imobiliária','São Paulo','SP','horizonteimoveis.com.br','@horizonteimoveis','(11) 3222-4040','(11) 98888-4040','Carlos Motta','Sócio',52,9800000,icp_imob,78,'contatado',s_feito,'Médio','mock',now() - interval '3 days','Follow-up 2 de 4',now() + interval '5 hours')
  returning id into p2;

  insert into public.prospects (user_id,company,niche,city,state,website,instagram,whatsapp,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,source,next_action,next_action_at)
  values (uid,'Villa Prime Realty','Imobiliária','Campinas','SP','villaprime.com.br','@villaprime','(19) 97777-2020','Renata Costa','Gerente de Marketing',14,2100000,icp_imob,61,'contatar',s_contatar,'mock','Primeiro contato',now())
  returning id into p3;

  insert into public.prospects (user_id,company,niche,city,state,website,instagram,whatsapp,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,source,next_action,next_action_at)
  values (uid,'Clínica Vitalis','Clínica','São Paulo','SP','clinicavitalis.com.br','@clinicavitalis','(11) 96666-3030','Ana Beatriz Ramos','Sócia-diretora',22,3400000,icp_clin,88,'respondeu',s_resp,'mock','Enviar proposta comercial',now() + interval '1 day')
  returning id into p4;

  insert into public.prospects (user_id,company,niche,city,state,website,whatsapp,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,source,next_action,next_action_at)
  values (uid,'Studio Arquitetura Lima','Arquitetura','Curitiba','PR','studiolima.arq.br','(41) 95555-7070','Marcos Lima','Sócio',9,1200000,icp_imob,71,'reuniao',s_reuniao,'mock','Reunião de diagnóstico',now() + interval '6 hours')
  returning id into p5;

  insert into public.prospects (user_id,company,niche,city,state,instagram,whatsapp,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,source)
  values (uid,'Escola Nova Era','Educação','Joinville','SC','@escolanovaera','(47) 94444-8080','Patrícia Souza','Diretora',65,7200000,null,58,'novo',s_novos,'mock')
  returning id into p6;

  insert into public.prospects (user_id,company,niche,city,state,website,instagram,whatsapp,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,source,next_action,next_action_at)
  values (uid,'Odonto Sorriso Real','Odontologia','Porto Alegre','RS','sorrisoreal.com.br','@sorrisoreal','(51) 93333-9090','Felipe Andrade','Gestor',18,2600000,icp_clin,66,'qualificado',s_qual,'mock','Confirmar orçamento',now() + interval '2 days')
  returning id into p7;

  insert into public.prospects (user_id,company,niche,city,state,website,instagram,whatsapp,contact_name,contact_role,employees,revenue,icp_id,icp_score,status,stage_id,source)
  values (uid,'Grupo Alto Padrão','Imobiliária','Florianópolis','SC','grupoaltopadrao.com.br','@grupoaltopadrao','(48) 92222-1111','Luciana Freitas','Head de Vendas',44,11000000,icp_imob,90,'proposta',s_prop,'mock')
  returning id into p8;

  insert into public.prospect_tags (user_id,prospect_id,tag_id) values
    (uid,p1,t_quente),(uid,p1,t_alto),(uid,p4,t_quente),(uid,p5,t_indicacao),(uid,p8,t_alto);

  insert into public.activities (user_id,prospect_id,type,description,created_at) values
    (uid,p1,'encontrado','Prospect encontrado na busca por ICP', now() - interval '6 days'),
    (uid,p1,'pipeline','Adicionado ao pipeline', now() - interval '6 days'),
    (uid,p1,'mensagem','Mensagem de primeiro contato enviada', now() - interval '3 days'),
    (uid,p1,'resposta','Respondeu: quer entender melhor a proposta', now() - interval '1 day'),
    (uid,p2,'encontrado','Prospect encontrado na busca por ICP', now() - interval '8 days'),
    (uid,p2,'mensagem','Follow-up 1 enviado', now() - interval '3 days'),
    (uid,p4,'resposta','Respondeu pedindo valores', now() - interval '4 hours'),
    (uid,p5,'reuniao','Reunião agendada', now() - interval '2 days'),
    (uid,p8,'proposta','Proposta enviada', now() - interval '5 days');

  insert into public.message_templates (user_id,name,body) values
    (uid,'Primeiro contato','Olá, {{nome}}. Vi o trabalho da {{empresa}} em {{cidade}} e queria te fazer uma pergunta rápida sobre captação de clientes. Posso?'),
    (uid,'Follow-up 1','{{nome}}, tudo bem? Passando para saber se faz sentido conversarmos sobre previsibilidade de clientes na {{empresa}}.'),
    (uid,'Convite para reunião','{{nome}}, consigo te mostrar em 15 minutos como outras empresas de {{nicho}} estão gerando reuniões. Tem agenda esta semana?');

  insert into public.sequences (user_id,name,status,stop_on_reply) values (uid,'Primeiro contato','ativa',true) returning id into seq;
  insert into public.sequence_steps (user_id,sequence_id,position,delay_days,body) values
    (uid,seq,1,0,'Olá, {{nome}}. Vi o trabalho da {{empresa}} e queria te fazer uma pergunta rápida.'),
    (uid,seq,2,2,'{{nome}}, você chegou a ver minha mensagem?'),
    (uid,seq,3,4,'Deixo um exemplo de resultado com outra empresa de {{nicho}}.'),
    (uid,seq,4,7,'{{nome}}, encerro por aqui. Se quiser retomar, me chama.')
  ;
  select id into step1 from public.sequence_steps where sequence_id = seq and position = 3;
  insert into public.scheduled_messages (user_id,prospect_id,sequence_id,step_id,scheduled_at,status,body)
  values (uid,p2,seq,step1,now() + interval '5 hours','agendada','Deixo um exemplo de resultado com outra empresa de Imobiliária.');

  insert into public.whatsapp_conversations (user_id,prospect_id,last_message_at,last_message_preview,unread_count)
  values (uid,p1,now() - interval '1 day','Pode me mandar mais detalhes?',1) returning id into c1;
  insert into public.whatsapp_messages (user_id,conversation_id,direction,body,created_at) values
    (uid,c1,'out','Olá, João. Vi o trabalho da Imobiliária Prime e queria te fazer uma pergunta rápida.', now() - interval '3 days'),
    (uid,c1,'in','Boa tarde! Pode falar.', now() - interval '2 days'),
    (uid,c1,'out','Vocês hoje conseguem prever quantas reuniões terão no mês?', now() - interval '2 days'),
    (uid,c1,'in','Pode me mandar mais detalhes?', now() - interval '1 day');

  insert into public.whatsapp_conversations (user_id,prospect_id,last_message_at,last_message_preview,unread_count)
  values (uid,p4,now() - interval '4 hours','Qual o valor do projeto?',1) returning id into c2;
  insert into public.whatsapp_messages (user_id,conversation_id,direction,body,created_at) values
    (uid,c2,'out','Olá, Ana. Vi a Clínica Vitalis e queria te fazer uma pergunta rápida.', now() - interval '2 days'),
    (uid,c2,'in','Qual o valor do projeto?', now() - interval '4 hours');

  insert into public.custom_fields (user_id,name,field_type,position) values
    (uid,'Ticket médio','number',1),
    (uid,'Investimento em marketing','number',2),
    (uid,'Agência atual','text',3),
    (uid,'Potencial','select',4);
end $$;

grant execute on function public.bootstrap_workspace() to authenticated;