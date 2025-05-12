# 🛡️ Role-Based Permissions Matrix

## 🎓 Student

| Permission                  | Description                                             |
|----------------------------|---------------------------------------------------------|
| view_public_competitions   | Can view competitions marked as public                 |
| view_school_competitions   | Can view competitions created by their own school      |
| view_own_profile           | Can view and update their personal profile             |

---

## 🏫 School Admin

| Permission                      | Description                                                                 |
|--------------------------------|-----------------------------------------------------------------------------|
| manage_competitions            | Create competitions for their school and configure visibility settings     |
| restrict_competitions_to_schools | Select which schools can view restricted competitions                      |
| invite_users                   | Add users (e.g. students, co-admins)                                       |
| view_tenant_competitions       | View all competitions created by their school                              |
| view_school_profile            | View the school’s profile and general information                          |

---

## 🛡️ Superuser (Platform Admin)

| Permission              | Description                                               |
|------------------------|-----------------------------------------------------------|
| view_all_tenants       | View all schools and their data                           |
| view_all_users         | View all users across all schools                         |
| view_all_competitions  | View all competitions across all schools                  |
| manage_tenants         | Create, update, or delete tenant accounts                 |
| impersonate_users      | Log in as any user for support or debugging               |
