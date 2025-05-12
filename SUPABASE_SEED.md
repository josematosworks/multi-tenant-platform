```sql
INSERT INTO public.tenants (id, name) VALUES
('34560171-ffd9-48c6-8367-460efd424ee5', 'School 1'),
('a367592b-20be-4605-ba64-8d7726a66c60', 'School 2'),
('90b0527f-28e3-476e-9826-e33ab734a1a6', 'School 3');

INSERT INTO public.users (id, email, tenant_id, role) VALUES
('d6af08ba-c600-4283-a157-fb03c9c93c25', 'admin@school3.com', '90b0527f-28e3-476e-9826-e33ab734a1a6', 'school_admin'),
('8ee5a2cd-351a-4d48-b119-72665e820502', 'admin@school2.com', 'a367592b-20be-4605-ba64-8d7726a66c60', 'school_admin'),
('ef594b11-d187-4e8f-b738-4840d5bf22aa', 'developer@josematoswork.com', '34560171-ffd9-48c6-8367-460efd424ee5', 'superuser'),
('d3230f42-571a-497c-b9a7-cc1f77c305fe', 'admin@school1.com', '34560171-ffd9-48c6-8367-460efd424ee5', 'school_admin'),
('4718948e-7fe5-4f33-a0ff-bfb5ed9964d4', 'student3@school3.com', '90b0527f-28e3-476e-9826-e33ab734a1a6', 'student'),
('6be643f0-fd4e-4eb3-8ba8-fce94f8bf3d1', 'student4@school3.com', '90b0527f-28e3-476e-9826-e33ab734a1a6', 'student'),
('e4aad776-b198-4df4-a8b6-07313dba54e2', 'student2@school2.com', 'a367592b-20be-4605-ba64-8d7726a66c60', 'student'),
('92be4158-5543-414f-8dcf-dcda61127f06', 'student1@school1.com', '34560171-ffd9-48c6-8367-460efd424ee5', 'student');

INSERT INTO public.competitions (id, title, description, visibility, tenant_id) VALUES
('182a0a89-7cbf-4fa8-9288-076c599129eb', 'School 1 Competition 1', 'Public competition held by School 1', 'public', '34560171-ffd9-48c6-8367-460efd424ee5'),
('65eff365-bad0-413e-a6d4-8937b3339275', 'School 1 Competition 2', 'Private competition held by School 1', 'private', '34560171-ffd9-48c6-8367-460efd424ee5'),
('25183447-ee94-49d0-8c20-55cf7f6207b0', 'School 1 Competition 3', 'Restricted competition held by School 1', 'restricted', '34560171-ffd9-48c6-8367-460efd424ee5'),
('59cba21e-34e1-44c2-8268-33be815211f4', 'School 2 Competition 1', 'Public competition held by School 2', 'public', 'a367592b-20be-4605-ba64-8d7726a66c60'),
('37d40bb3-35bc-4292-8b76-980fa42212d4', 'School 2 Competition 2', 'Private competition held by School 2', 'private', 'a367592b-20be-4605-ba64-8d7726a66c60'),
('bb4d7c70-4ded-46ab-b195-9286567cdcb7', 'School 2 Competition 3', 'Restricted competition held by School 2', 'restricted', 'a367592b-20be-4605-ba64-8d7726a66c60'),
('69d5bb4c-46e6-4b44-b008-0f92657a5bc2', 'School 3 Competition 1', 'Public competition held by School 3', 'public', '90b0527f-28e3-476e-9826-e33ab734a1a6'),
('0c2aaf25-1da5-43e0-93e7-a5f8e7465713', 'School 3 Competition 2', 'Private competition held by School 3', 'private', '90b0527f-28e3-476e-9826-e33ab734a1a6'),
('3aded718-afaa-42eb-97af-cb4792a85563', 'School 3 Competition 3', 'Restricted competition held by School 3', 'restricted', '90b0527f-28e3-476e-9826-e33ab734a1a6');

INSERT INTO public.competition_allowed_schools (competition_id, school_id) VALUES
('25183447-ee94-49d0-8c20-55cf7f6207b0', '90b0527f-28e3-476e-9826-e33ab734a1a6'),
('bb4d7c70-4ded-46ab-b195-9286567cdcb7', '34560171-ffd9-48c6-8367-460efd424ee5'),
('3aded718-afaa-42eb-97af-cb4792a85563', 'a367592b-20be-4605-ba64-8d7726a66c60');
```
