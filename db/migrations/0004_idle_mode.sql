-- O que conta como atividade para a ociosidade: só cliques/rolagem, ou cliques + teclado.
alter table organizations add column idle_mode text not null default 'clicks' check (idle_mode in ('clicks','clicks_keyboard'));
