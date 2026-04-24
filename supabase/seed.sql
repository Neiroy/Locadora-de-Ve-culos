insert into public.clientes (nome, cpf, cnh, telefone)
values
  ('Joao Pereira', '12345678909', '12345678900', '11999990000'),
  ('Mariana Souza', '98765432100', '10987654321', '11988887777')
on conflict do nothing;

insert into public.carros (marca, modelo, placa, ano, cor, km_atual, valor_diaria, status, observacoes)
values
  ('Toyota', 'Corolla', 'ABC1D23', 2023, 'Prata', 15200, 220, 'disponivel', 'Revisado'),
  ('Volkswagen', 'T-Cross', 'EFG4H56', 2022, 'Branco', 28400, 250, 'disponivel', null),
  ('Fiat', 'Argo', 'IJK7L89', 2021, 'Preto', 43010, 160, 'manutencao', 'Troca de pastilhas')
on conflict do nothing;
