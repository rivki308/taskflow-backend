# TaskFlow Pro — צד השרת (Backend)

מערכת לניהול משימות בצוות. **מנהל צוות (Admin)** יוצר פרויקטים ומשימות ומשייך אותן לעובדים, ו**עובד (Employee)** רואה רק את המשימות שלו, מעדכן את הסטטוס שלהן ומוסיף הערות.

> 📘 **מתחילה מאפס?** קראי את [START-HERE.md](START-HERE.md) — הסבר צעד־אחר־צעד להעלאה ל־GitHub, למסד נתונים בענן ול־Render.
> 📗 **כותבת את צד ה־React?** קראי את [FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md) — כל מה שצריך כדי להתחבר לשרת.

---

## טכנולוגיות

| תחום | טכנולוגיה |
|------|-----------|
| סביבת הרצה | Node.js 20+ (נבדק על Node 22/24) |
| שרת | Express 5 |
| שפה | TypeScript במצב `strict` |
| מסד נתונים | PostgreSQL |
| ORM | Prisma 6 (כולל Migrations) |
| ולידציה | Zod |
| התחברות | JWT (HS256) + bcrypt |
| תיעוד | Swagger UI / OpenAPI 3 בכתובת `/api-docs` |
| בדיקות | Vitest + Supertest על PostgreSQL אמיתי |

---

## הפעלה מקומית במחשב (בלי להתקין PostgreSQL)

```bash
npm install                 # התקנת ספריות (פעם אחת)
copy .env.example .env      # ב-Mac/Linux:  cp .env.example .env
npm run db:local            # מפעיל PostgreSQL מקומי — השאירי את החלון פתוח
```

בחלון טרמינל **נוסף**:

```bash
npm run db:migrate          # יצירת הטבלאות
npm run db:seed             # נתוני הדגמה (מוחק נתונים קיימים!)
npm run dev                 # הפעלת השרת במצב פיתוח
```

פתחי בדפדפן:
- Swagger: <http://localhost:4000/api-docs>
- בדיקת תקינות: <http://localhost:4000/api/health>

**משתמשי הדגמה (רק בסביבת פיתוח):**

| תפקיד | אימייל | סיסמה |
|-------|--------|-------|
| מנהל | `admin@taskflow.test` | `Admin123!` |
| עובדת | `noa@taskflow.test` | `Employee123!` |
| עובד | `yossi@taskflow.test` | `Employee123!` |

> `npm run db:local` מריץ שרת PostgreSQL 17 אמיתי מתוך חבילת npm (`embedded-postgres`). אם כבר מותקן אצלך PostgreSQL, אפשר פשוט לשים את כתובת החיבור שלו ב־`DATABASE_URL`.
> ב־Windows, PostgreSQL לא עובד מתיקייה עם שם בעברית, ולכן הסקריפט מעתיק את קובצי ההפעלה פעם אחת לתיקייה `C:\Users\<שם>\.taskflow-pg`.

---

## פקודות npm

| פקודה | מה היא עושה |
|-------|-------------|
| `npm run dev` | שרת פיתוח עם רענון אוטומטי |
| `npm run build` | `prisma generate` + קומפילציה של TypeScript לתיקייה `dist/` |
| `npm start` | הפעלת השרת המקומפל |
| `npm run start:prod` | Migrations ואז הפעלת השרת |
| `npm run start:render` | Migrations, Seed **רק אם המסד ריק**, ואז הפעלת השרת (משמש את Render) |
| `npm run typecheck` | בדיקת טיפוסים של TypeScript |
| `npm test` | כל הבדיקות האוטומטיות (מרים מסד בדיקות זמני ומוחק אותו בסוף) |
| `npm run db:local` | PostgreSQL מקומי לפיתוח |
| `npm run db:migrate` | הרצת Migrations (`prisma migrate deploy`) |
| `npm run db:seed` | נתוני הדגמה — **מוחק את כל הנתונים הקיימים** |
| `npm run db:seed:prod` | Seed לפרודקשן (מחייב סיסמאות במשתני סביבה) |
| `npm run db:studio` | ממשק גרפי לצפייה בטבלאות (Prisma Studio) |
| `npm run openapi:export` | עדכון הקובץ `docs/openapi.json` |

---

## משתני סביבה

| משתנה | חובה | הסבר |
|-------|------|------|
| `DATABASE_URL` | ✅ | כתובת החיבור ל־PostgreSQL |
| `JWT_SECRET` | ✅ | סוד לחתימת הטוקנים, לפחות 32 תווים אקראיים |
| `JWT_EXPIRES_IN` | | תוקף הטוקן (ברירת מחדל `2h`) |
| `PORT` | | פורט השרת (ברירת מחדל 4000; Render מגדיר לבד) |
| `CORS_ORIGINS` | | כתובות ה־React המורשות, מופרדות בפסיק |
| `LOGIN_RATE_LIMIT_MAX` | | מספר ניסיונות התחברות כושלים לכל IP ב־15 דקות (ברירת מחדל 10) |
| `SEED_ADMIN_EMAIL` | | אימייל המנהל בנתוני ההדגמה |
| `SEED_ADMIN_PASSWORD` / `SEED_EMPLOYEE_PASSWORD` | בפרודקשן | סיסמאות לנתוני ההדגמה (לפחות 10 תווים). בפרודקשן לא משתמשים בסיסמאות ידועות |

השרת **לא יעלה** אם `DATABASE_URL` או `JWT_SECRET` חסרים או לא תקינים, ויציג הודעה ברורה.

---

## ארכיטקטורה

```
בקשת HTTP
   │
   ▼
routes/        ← איזה URL מפעיל איזו פונקציה + middleware של התחברות והרשאה
   │
   ▼
middleware/    ← authenticate (JWT), authorize (תפקיד), טיפול בשגיאות, הגבלת ניסיונות התחברות
   │
   ▼
controllers/   ← קריאת הבקשה, ולידציה עם Zod, החזרת תשובת JSON
   │
   ▼
services/      ← לוגיקה עסקית וכללי הרשאה (למשל: עובד רואה רק את המשימות שלו)
   │
   ▼
repositories/  ← כל הגישה למסד הנתונים (Prisma), בחירת שדות בטוחים בלבד
   │
   ▼
PostgreSQL
```

```
backend-project/
├── src/
│   ├── app.ts               יצירת אפליקציית Express (CORS, Helmet, Swagger, routes)
│   ├── server.ts            הפעלת השרת
│   ├── config/env.ts        קריאה ובדיקה של משתני הסביבה
│   ├── auth/                JWT וגיבוב סיסמאות
│   ├── database/            Prisma Client ו־Seed
│   ├── models/              טיפוסים וערכים מותרים (תפקידים, סטטוסים, עדיפויות)
│   ├── validators/          סכמות Zod לכל קלט
│   ├── repositories/        שאילתות למסד
│   ├── services/            לוגיקה עסקית והרשאות
│   ├── controllers/         טיפול בבקשות HTTP
│   ├── routes/              הגדרת הנתיבים
│   ├── middleware/          התחברות, הרשאות, שגיאות, Rate limit
│   ├── docs/openapi.ts      תיעוד Swagger
│   └── utils/               עזרים (שגיאות HTTP, תאריכים)
├── prisma/
│   ├── schema.prisma        מבנה הטבלאות
│   └── migrations/          קובצי SQL ליצירת הטבלאות + אילוצי CHECK
├── tests/                   בדיקות אוטומטיות
├── scripts/                 PostgreSQL מקומי, ייצוא OpenAPI
├── docs/openapi.json        קובץ OpenAPI
├── render.yaml              הגדרות פריסה ל־Render
├── START-HERE.md            מדריך העלאה לענן (עברית)
└── FRONTEND-API-GUIDE.md    מדריך API לצד ה־React (עברית)
```

---

## מסד הנתונים

ארבע טבלאות:

| טבלה | שדות עיקריים | אילוצים |
|------|--------------|---------|
| `users` | id, name, email, password_hash, role, token_version, created_at | email ייחודי; role ∈ {Admin, Employee} |
| `projects` | id, name, description, start_date, end_date, status, created_by, created_at | status ∈ {Active, Completed, On Hold}; end_date ≥ start_date; FK created_by → users |
| `tasks` | id, title, description, assigned_to, created_by, project_id, priority, status, due_date, created_at, updated_at | priority ∈ {Low, Medium, High}; status ∈ {To Do, In Progress, Done}; ברירת מחדל `To Do`; 3 FK |
| `comments` | id, task_id, user_id, content, created_at | התוכן לא ריק ולא רק רווחים; FK task_id → tasks, user_id → users |

**קשרים:** משתמש יוצר הרבה פרויקטים ומשימות; לעובד משויכות הרבה משימות; לפרויקט הרבה משימות; למשימה הרבה הערות; משתמש כותב הרבה הערות.

**מחיקות:** מחיקת משימה מוחקת גם את ההערות שלה, בטרנזקציה אחת. אי אפשר למחוק משתמש או פרויקט שיש להם משימות (`RESTRICT`), כדי לא לאבד מידע.

**אינדקסים:** `tasks.assigned_to`, `project_id`, `status`, `priority`, `due_date`, `comments.task_id`, `projects.status`.

---

## נתיבי ה־API

| Method | URL | מי מורשה |
|--------|-----|----------|
| GET | `/api/health` | כולם |
| POST | `/api/auth/login` | כולם |
| POST | `/api/auth/logout` | משתמש מחובר |
| GET | `/api/auth/me` | משתמש מחובר |
| GET | `/api/dashboard/summary` | משתמש מחובר (עובד: רק הנתונים שלו) |
| GET | `/api/tasks` | משתמש מחובר (עובד: רק המשימות שלו) |
| GET | `/api/tasks/:id` | מנהל, או העובד שהמשימה שלו |
| POST | `/api/tasks` | מנהל |
| PATCH | `/api/tasks/:id` | מנהל: כל השדות. עובד: רק `status`, ורק במשימה שלו |
| DELETE | `/api/tasks/:id` | מנהל |
| GET | `/api/tasks/:id/comments` | מי שמורשה לראות את המשימה |
| POST | `/api/tasks/:id/comments` | מי שמורשה לראות את המשימה |
| GET | `/api/projects` | משתמש מחובר (עובד: רק פרויקטים שיש בהם משימות שלו) |
| GET | `/api/projects/:id` | כמו למעלה |
| POST | `/api/projects` | מנהל |
| PATCH | `/api/projects/:id` | מנהל |
| GET | `/api/users` | מנהל |
| POST | `/api/users` | מנהל (הוספת עובד) |

פירוט מלא, כולל דוגמאות, נמצא ב־Swagger (`/api-docs`) ובקובץ [FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).

---

## אבטחה — מה מומש

- סיסמאות נשמרות רק כ־Hash של bcrypt. ה־Hash לא מוחזר אף פעם ב־API.
- הטוקן (JWT) חתום ב־HS256 ונבדקים בו חתימה, תוקף, issuer ו־audience. אלגוריתם `none` נדחה.
- המשתמש מזוהה לפי ה־id שבטוקן ונטען מחדש ממסד הנתונים בכל בקשה. לכן התפקיד תמיד עדכני, והלקוח לא יכול לבחור "מי הוא".
- **התנתקות:** לכל משתמש יש `token_version`. ההתנתקות מעלה אותו באחד, ואז כל הטוקנים הקודמים מקבלים 401.
- **מניעת Mass Assignment:** כל הסכמות "קפדניות" (strict), ושדה לא מוכר מחזיר 400. השדות `createdBy` ו־`userId` נקבעים רק לפי הטוקן. עובד ששולח שדה מוגן מקבל 403.
- עובד שמנסה לגשת למשימה של עובד אחר (גם בשינוי ה־id בכתובת) מקבל 403.
- ולידציה לכל גוף בקשה, פרמטר ו־query. המיון אפשרי רק לפי רשימה סגורה של שדות.
- Prisma שולחת רק שאילתות עם פרמטרים, ולכן אין SQL Injection.
- CORS לפי רשימת כתובות, Helmet, הגבלת גודל גוף בקשה (100kb), והגבלת ניסיונות התחברות.
- שגיאות פנימיות נרשמות רק בלוג של השרת. המשתמש מקבל הודעה כללית, בלי פרטי SQL או Stack Trace.
- נתוני ההדגמה בפרודקשן נוצרים רק עם סיסמאות ממשתני סביבה, ולא עם סיסמאות ידועות.

---

## בדיקות

```bash
npm test
```

הבדיקות מרימות **PostgreSQL אמיתי וזמני** על פורט 5544, מריצות עליו את ה־Migrations האמיתיים, ומוחקות אותו בסוף. מסד הפיתוח שלך לא נפגע.
אפשר גם להריץ אותן על מסד ריק משלך: `TEST_DATABASE_URL=postgresql://.../taskflow_test npm test` (שם המסד חייב להכיל `test`).

יש 92 בדיקות, והן מכסות: התחברות תקינה ושגויה, טוקן חסר, לא תקין, פג תוקף או מבוטל, הרשאות מנהל ועובד, CRUD, ולידציה, חיפוש, סינון, מיון ועימוד, חסימת גישה למשימות של אחרים, Mass Assignment, הערות, פרויקטים, משתמשים, אילוצי מסד הנתונים, תקינות סכמת Prisma, תקינות OpenAPI, CORS ו־health.
