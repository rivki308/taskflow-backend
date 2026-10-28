# 🚀 העלאת השרת ל-Render

מדריך להעלאת השרת של TaskFlow Pro לאינטרנט בחינם.

**השלבים:**
1. **Neon** – מסד נתונים PostgreSQL חינמי בענן.
2. **Render** – הפעלת השרת והתחברות למסד הנתונים.
3. **בדיקה** – דרך Swagger.

> **מגבלות המסלול החינמי:**
> - שרת חינמי ב-Render נכבה אחרי כ-15 דקות בלי שימוש, והבקשה הראשונה אחרי זה יכולה לקחת עד דקה.
> - ב-Neon יש מגבלת נפח ושעות פעילות, שמספיקה לפרויקט הזה.
> - מסד הנתונים החינמי של Render עצמו פג תוקף אחרי תקופה מוגבלת, ולכן משתמשים ב-Neon.

הקוד נמצא ב-GitHub: https://github.com/rivki308/taskflow-backend

---

## חלק א – מסד נתונים ב-Neon

### 1. יצירת פרויקט
1. נכנסים ל-<https://neon.tech> ונרשמים (אפשר עם **Continue with GitHub**).
2. **Create project**:
   - **Project name:** `taskflow`
   - **Postgres version:** הגרסה המוצעת
   - **Region:** **AWS Europe Central 1 (Frankfurt)**, קרוב לשרת ב-Render
3. **Create project**. נוצר מסד נתונים בשם `neondb`.

### 2. כתובת החיבור (Connection String)
1. לוחצים **Connect**.
2. מכבים את **Connection pooling** – Prisma Migrations צריך חיבור ישיר.
3. מעתיקים את הכתובת. היא נראית כך:
   ```
   postgresql://neondb_owner:AbCdEf123@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. אם בסוף מופיע `&channel_binding=require`, מוחקים אותו כך שיישאר רק `?sslmode=require`.

> 🔒 הכתובת כוללת סיסמה. לא כותבים אותה בקוד ולא מעלים ל-GitHub. אם היא נחשפה, ב-Neon אפשר לאפס את הסיסמה (**Reset password**).

השרת יוצר את הטבלאות לבד בהפעלה הראשונה, כך שאין צורך לעשות שום דבר נוסף ב-Neon.

> **חלופה – Supabase:** ב-<https://supabase.com> יוצרים פרויקט, לוחצים **Connect** ובוחרים **Session pooler** (פורט 5432). לא להשתמש ב-Transaction pooler (פורט 6543), כי Migrations לא עובדים איתו.

---

## חלק ב – הפעלת השרת ב-Render

### 1. חשבון
נרשמים ב-<https://render.com> עם **GitHub** ומאשרים גישה ל-repository `taskflow-backend`.

### 2. יצירת השירות

**אפשרות א (מומלצת) – Blueprint**, לפי הקובץ `render.yaml`:
1. **New +** ← **Blueprint**.
2. בוחרים את `taskflow-backend` ← **Connect**.
3. ממלאים את המשתנים:

   | משתנה | ערך |
   |-------|-----|
   | `DATABASE_URL` | כתובת החיבור מ-Neon |
   | `CORS_ORIGINS` | כתובת אתר ה-React. אם עוד אין – זמנית `http://localhost:5173` |
   | `SEED_ADMIN_PASSWORD` | סיסמה למנהלת ההדגמה, לפחות 10 תווים |
   | `SEED_EMPLOYEE_PASSWORD` | סיסמה לעובדות ההדגמה, לפחות 10 תווים |

   `JWT_SECRET` נוצר אוטומטית, ושאר המשתנים מוגדרים בקובץ.
4. **Apply**.

> אם Render מבקש פרטי אשראי עבור Blueprint, אפשר להשתמש באפשרות ב.

**אפשרות ב – Web Service ידני:**
1. **New +** ← **Web Service** ← בוחרים את ה-repository.
2. הגדרות:

   | שדה | ערך |
   |-----|-----|
   | Name | `taskflow-pro-api` |
   | Region | `Frankfurt (EU Central)` |
   | Branch | `main` |
   | Runtime | `Node` |
   | Build Command | `npm ci --include=dev && npm run build` |
   | Start Command | `npm run start:render` |
   | Instance Type | **Free** |

3. **Environment Variables:**

   | Key | Value |
   |-----|-------|
   | `NODE_VERSION` | `22` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | כתובת החיבור מ-Neon |
   | `JWT_SECRET` | מחרוזת אקראית של 32 תווים לפחות |
   | `JWT_EXPIRES_IN` | `2h` |
   | `CORS_ORIGINS` | כתובת אתר ה-React, או זמנית `http://localhost:5173` |
   | `SEED_ADMIN_EMAIL` | `admin@taskflow.test` |
   | `SEED_ADMIN_PASSWORD` | סיסמה, לפחות 10 תווים |
   | `SEED_EMPLOYEE_PASSWORD` | סיסמה, לפחות 10 תווים |

   ל-`JWT_SECRET` אפשר להשתמש בכפתור **Generate**, או ליצור מחרוזת כך:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
4. **Advanced** ← **Health Check Path**: `/api/health`.
5. **Create Web Service**.

### 3. מה קורה בהפעלה
הפקודה `npm run start:render` מריצה בכל הפעלה:
1. `prisma migrate deploy` – יצירה או עדכון של הטבלאות.
2. Seed – **רק אם המסד ריק**: מנהלת, 2 עובדות, 3 פרויקטים ו-12 משימות. נתונים קיימים לא נמחקים.
3. הפעלת השרת.

הבנייה לוקחת 3–6 דקות. בלשונית **Logs** אמורות להופיע בסוף השורות:
```
All migrations have been successfully applied.
[seed] Done:
[server] TaskFlow Pro API running on port 10000 (production)
```
והסטטוס משתנה ל-**Live** 🟢. כל push ל-`main` מפעיל Deploy חדש אוטומטית.

---

## חלק ג – בדיקה

כתובת השרת מופיעה בראש עמוד השירות, למשל `https://taskflow-pro-api.onrender.com`.

1. **תקינות:** `https://YOUR-APP.onrender.com/api/health` צריך להחזיר `{"status":"ok","database":"ok",...}`.
2. **Swagger:** `https://YOUR-APP.onrender.com/api-docs`.
3. **התחברות:** **POST /api/auth/login** ← **Try it out**:
   ```json
   { "email": "admin@taskflow.test", "password": "הסיסמה מ-SEED_ADMIN_PASSWORD" }
   ```
   ← **Execute**, ומעתיקים את ה-`token` מהתשובה.
4. **Authorize** 🔓 ← מדביקים את הטוקן (בלי Bearer).
5. **GET /api/auth/me** מחזיר את פרטי המנהלת.
   - **401:** אחרי **Logout** ב-Authorize.
   - **403:** כעובדת (`noa@taskflow.test`), בקריאה ל-**GET /api/users**.
6. **יצירה ושליפה:** **POST /api/tasks** מחזיר `201` עם `id`, ו-**GET /api/tasks/{id}** מחזיר את המשימה. אפשר לראות אותה גם ב-Neon תחת **Tables** ← `tasks`.

---

## חלק ד – פתרון תקלות

| תקלה | סימן | פתרון |
|------|------|-------|
| Build Failed | `npm ERR!` או `error TS` | לוודא שה-Build Command הוא `npm ci --include=dev && npm run build` |
| `tsc: not found` | בזמן Build | חסר `--include=dev` ב-Build Command |
| DATABASE_URL שגוי | `Invalid environment variables: DATABASE_URL` / `P1001` | להעתיק שוב מ-Neon – מתחיל ב-`postgresql://`, מסתיים ב-`?sslmode=require`, בלי רווחים ומירכאות |
| `P1000: Authentication failed` | סיסמה שגויה | לאפס סיסמה ב-Neon ולעדכן ב-Render (**Environment** ← **Save Changes**) |
| `P3009` / failed migrations | בזמן הפעלה | לאפס את המסד ב-Neon (**Branches** ← **Reset**) ואז **Manual Deploy** |
| שגיאת TLS / `channel_binding` | ב-Logs | למחוק `&channel_binding=require` מהכתובת |
| JWT_SECRET חסר | `JWT_SECRET is required` | להוסיף מחרוזת של 32 תווים לפחות |
| שגיאת CORS | `blocked by CORS policy` בדפדפן | ב-`CORS_ORIGINS` – כתובת אתר ה-React בדיוק, עם `https://` ובלי `/` בסוף. כמה כתובות – מופרדות בפסיק |
| 401 | כל בקשה נדחית | טוקן חסר, פג תוקף (`TOKEN_EXPIRED`) או בוטל (`TOKEN_REVOKED`) – להתחבר מחדש |
| 403 | "אין הרשאה" | התנהגות תקינה – הפעולה מותרת רק למנהלת |
| `Admin123!` לא עובד בענן | 401 | בענן הסיסמאות הן אלה שהוגדרו ב-`SEED_ADMIN_PASSWORD` / `SEED_EMPLOYEE_PASSWORD` |
| אין משתמשים | התחברות נכשלת | אם סיסמאות ה-Seed חסרו בהפעלה הראשונה, ה-Seed דילג. להוסיף אותן ולהריץ **Manual Deploy** |
| Swagger לא נפתח | עמוד לבן / 404 | הכתובת היא `/api-docs`. אפשר לנסות גם `/api-docs.json` |
| השרת לא עולה | `Exited with status 1` | לקרוא את ה-Logs – השרת מדפיס איזה משתנה חסר |
| `"database":"error"` | ב-health | לבדוק את `DATABASE_URL` ושהפרויקט ב-Neon פעיל |

---

## העלאת צד הלקוח

ב-Render: **New +** ← **Static Site** ← `taskflow-client`:
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Environment Variable:** `VITE_API_URL` = כתובת השרת, בלי `/api` בסוף
- **Redirects/Rewrites:** `/*` ← `/index.html`, מסוג **Rewrite**

אחרי שהאתר עולה, מעדכנים בשירות **השרת** את `CORS_ORIGINS` לכתובת האתר.
פרטים על החיבור לשרת: [FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md).

---

## הרצה מקומית

פירוט ב-[README.md](README.md). בקצרה:
```
npm install
copy .env.example .env
npm run db:local        (בחלון נפרד, להשאיר פתוח)
npm run db:migrate
npm run db:seed
npm run dev
```
ואז לפתוח <http://localhost:4000/api-docs>.
