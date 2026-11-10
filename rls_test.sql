\set ON_ERROR_STOP 1
insert into auth.users (id, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','{"full_name":"JJ"}'),
 ('22222222-2222-2222-2222-222222222222','{"name":"Bob"}'),
 ('33333333-3333-3333-3333-333333333333','{}');
select display_name, length(friend_code) from profiles order by 1;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select * from my_profile();
-- push token update + visibility
update profiles set push_token='ExponentPushToken[x]' where id=auth.uid();
\echo '--- select push_token should fail:'
\set ON_ERROR_STOP 0
select push_token from profiles;
\set ON_ERROR_STOP 1
select add_friend((select friend_code from profiles where display_name='Bob'));
\echo '--- victim not friend yet (pending) -> insert must fail:'
\set ON_ERROR_STOP 0
insert into farts (lat,lng,victim_id) values (45,4,'22222222-2222-2222-2222-222222222222');
\set ON_ERROR_STOP 1
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select * from my_friends();
update friendships set status='accepted' where addressee_id=auth.uid();
insert into farts (lat,lng,kind,power) values (45.1,4.2,'tonitruant',5);
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into farts (lat,lng,victim_id,note) values (45,4,'22222222-2222-2222-2222-222222222222','dans l''ascenseur') returning id;
insert into farts (lat,lng,victim_name) values (45,4,'Tonton');
select count(*) as visible_for_jj from farts;
select f.id, p.display_name from farts f join profiles p on p.id=f.user_id order by f.id;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select count(*) as visible_for_stranger from farts;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select create_league('Bureau') as lid \gset
select invite_code as code from leagues where id=:lid \gset
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select join_league(lower(:'code')) is not null as bob_joined;
select * from league_leaderboard(:lid, now() - interval '1 day');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
\echo '--- stranger leaderboard must fail:'
\set ON_ERROR_STOP 0
select * from league_leaderboard(:lid, now());
\set ON_ERROR_STOP 1
select count(*) as leagues_visible_stranger from leagues;
insert into reports (fart_id, reason) values (2,'test');
select delete_my_account();
reset role;
select count(*) as users_left from auth.users; select count(*) profiles_left from profiles;
