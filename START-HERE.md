# 🚀 מתחילים כאן — העלאת השרת של TaskFlow Pro לאינטרנט

המדריך הזה מיועד למי שמעולם לא העלתה שרת לאינטרנט. עברי על השלבים לפי הסדר.

**מה נעשה?**
1. **GitHub** — נשמור שם את הקוד.
2. **Neon** — ניצור שם מסד נתונים PostgreSQL חינמי בענן.
3. **Render** — נפעיל שם את השרת, והוא יתחבר למסד הנתונים.
4. **בדיקה** — נבדוק שהכול עובד דרך Swagger.

> ⚠️ **הערה חשובה וכנה:** לא יכולתי לפתוח ולבדוק את האתרים GitHub, Neon ו־Render כפי שהם נראים היום. שמות הכפתורים במדריך מבוססים על הממשק המוכר לי, ואתרים משנים את העיצוב מדי פעם. אם כפתור נקרא קצת אחרת, חפשי כפתור עם משמעות דומה. **הערכים שצריך להקליד** (פקודות, שמות משתנים) מדויקים ומותאמים לפרויקט הזה.

> ⚠️ **מסלולים חינמיים:** לכל שירות חינמי יש מגבלות, והן עשויות להשתנות. נכון לידיעתי:
> - ב־Render, שרת חינמי "נרדם" אחרי כ־15 דקות בלי שימוש. הבקשה הראשונה אחרי זה יכולה לקחת עד דקה. זה תקין.
> - ב־Neon יש מסלול חינמי עם מגבלת נפח ושעות פעילות, וזה מספיק בהחלט לפרויקט גמר.
> - מסד PostgreSQL החינמי של Render עצמו פג תוקף אחרי תקופה מוגבלת, ולכן אנחנו משתמשים ב־Neon.

---

## חלק א — GitHub (שמירת הקוד)

### 1. פתיחת חשבון
1. היכנסי ל־<https://github.com>.
2. לחצי **Sign up**.
3. הזיני אימייל, סיסמה ושם משתמש, ואשרי את האימייל.

### 2. יצירת Repository (מאגר)
1. לחצי על **+** בפינה הימנית העליונה, ואז **New repository**.
2. **Repository name:** `taskflow-pro-backend`
3. בחרי **Public** (כדי שהמרצה תוכל לראות) או **Private**.
4. **אל** תסמני "Add a README file". כבר יש לנו README.
5. לחצי **Create repository**.

### 3. חילוץ קובץ ה־ZIP
1. לחצי לחיצה ימנית על קובץ ה־ZIP ובחרי **חלץ הכול...** (Extract All).
2. תיווצר תיקייה בשם `backend-project`, ובתוכה קבצים כמו `package.json`, `README.md` ותיקיות `src`, `prisma`.

### 4. העלאת הקבצים דרך הדפדפן
1. בעמוד ה־Repository הריק לחצי על הקישור **uploading an existing file**. אם ה־Repository לא ריק: **Add file**, ואז **Upload files**.
2. פתחי את התיקייה `backend-project` במחשב.
3. סמני את **כל מה שבתוכה** (Ctrl+A) וגררי לחלון הדפדפן.
   - חשוב לגרור את **התוכן** של התיקייה, ולא את התיקייה עצמה. הקובץ `package.json` צריך להיות בשורש ה־Repository.
   - ודאי שגם הקבצים שמתחילים בנקודה עלו: `.gitignore`, `.env.example`.
   - ודאי שהקובץ `package-lock.json` עלה. Render צריך אותו.
4. למטה, בשדה **Commit changes**, כתבי: `Initial backend`.
5. לחצי **Commit changes** וחכי שההעלאה תסתיים.

> ❌ **אסור להעלות:** את התיקייה `node_modules` ואת הקובץ `.env` (הוא מכיל סודות). הם לא נמצאים ב־ZIP. אם יצרת אותם במחשב, אל תגררי אותם.

### 5. בדיקה שהקבצים נמצאים ב־GitHub
רענני את עמוד ה־Repository. אמורים להופיע בשורש:
`src/`, `prisma/`, `tests/`, `docs/`, `scripts/`, `package.json`, `package-lock.json`, `render.yaml`, `README.md`.
היכנסי ל־`prisma/migrations/` וודאי שיש שם תיקייה שמתחילה ב־`20261019`.

---

## חלק ב — מסד נתונים PostgreSQL חינמי (Neon)

### 1. פתיחת חשבון
1. היכנסי ל־<https://neon.tech> ולחצי **Sign up**.
2. הכי פשוט להירשם עם חשבון ה־GitHub שפתחת (**Continue with GitHub**).

### 2. יצירת Database
1. לחצי **Create project** (או **New Project**).
2. **Project name:** `taskflow`
3. **Postgres version:** 17 (או הגרסה המוצעת).
4. **Region:** בחרי אזור באירופה, למשל **AWS Europe Central 1 (Frankfurt)**. ככה הוא קרוב לשרת ב־Render שנגדיר בפרנקפורט.
5. לחצי **Create project**. Neon יוצר מסד נתונים בשם `neondb`.

### 3. קבלת Connection String (כתובת החיבור)
1. בלוח הבקרה של הפרויקט לחצי **Connect** (או **Connection Details**).
2. ודאי שהאפשרות **Connection pooling** / **Pooled connection** **כבויה**. אנחנו צריכים חיבור ישיר (Direct), כי Prisma Migrations עובד הכי טוב איתו.
3. העתיקי את הכתובת. היא נראית בערך כך:
   ```
   postgresql://neondb_owner:AbCdEf123@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. אם בסוף הכתובת מופיע `&channel_binding=require`, מחקי את החלק הזה כך שיישאר רק `?sslmode=require`.

### 4. שמירה בטוחה
- כתובת החיבור מכילה **סיסמה**. שמרי אותה רק במקום פרטי, למשל במנהל סיסמאות או בקובץ במחשב שלך.
- **לעולם** אל תכתבי אותה בקוד, ב־README או ב־GitHub.
- אם היא נחשפה בטעות, ב־Neon אפשר לאפס את הסיסמה (**Reset password**) ולקבל כתובת חדשה.

### 5. קישור השרת למסד הנתונים
אין צורך לעשות שום דבר ב־Neon. את הכתובת נדביק ב־Render במשתנה `DATABASE_URL` (בחלק הבא), והשרת ייצור את הטבלאות לבד בהפעלה הראשונה.

> **חלופה — Supabase:** ב־<https://supabase.com>: **New project**, ואז בעמוד הפרויקט **Connect**. בחרי **Session pooler** (פורט 5432, עובד עם IPv4) והחליפי את `[YOUR-PASSWORD]` בסיסמה שבחרת. אל תבחרי Transaction pooler (פורט 6543), כי Migrations לא עובדים איתו בלי הגדרות נוספות.

---

## חלק ג — Render (הפעלת השרת)

### 1. פתיחת חשבון
1. היכנסי ל־<https://render.com> ולחצי **Get Started** / **Sign Up**.
2. הירשמי עם **GitHub**. ככה החיבור ל־GitHub נעשה אוטומטית.

### 2. חיבור GitHub
אם נרשמת עם GitHub, Render יבקש אישור גישה ל־Repositories. אפשר לבחור **Only select repositories** ולסמן את `taskflow-pro-backend`, ואז **Install** / **Authorize**.

### 3–6. יצירת Web Service, בחירת ה־Repository והגדרות

**דרך א (מומלצת) — Blueprint, שמשתמשת בקובץ `render.yaml` שכבר מוכן:**
1. לחצי **New +**, ואז **Blueprint**.
2. בחרי את ה־Repository `taskflow-pro-backend` ולחצי **Connect**.
3. Render יקרא את `render.yaml`. **Blueprint Name:** `taskflow-pro`.
4. Render יבקש למלא את המשתנים שאין להם ערך:

   | משתנה | מה לכתוב |
   |-------|----------|
   | `DATABASE_URL` | כתובת החיבור מ־Neon |
   | `CORS_ORIGINS` | הכתובת של אתר ה־React שלך. אם עוד אין, כתבי זמנית `http://localhost:5173` |
   | `SEED_ADMIN_PASSWORD` | סיסמה למנהל ההדגמה, לפחות 10 תווים, למשל `MyAdminPass2026` |
   | `SEED_EMPLOYEE_PASSWORD` | סיסמה לעובדי ההדגמה, לפחות 10 תווים, למשל `MyEmployeePass2026` |

   `JWT_SECRET` נוצר אוטומטית כמחרוזת אקראית ארוכה, ושאר המשתנים כבר מוגדרים.
5. לחצי **Apply** / **Deploy Blueprint**.

> אם Render מבקש פרטי אשראי עבור Blueprint ואת לא רוצה למסור אותם, השתמשי בדרך ב.

**דרך ב — יצירה ידנית של Web Service:**
1. **New +**, ואז **Web Service**, ואז בחרי את ה־Repository ולחצי **Connect**.
2. מלאי:

   | שדה | ערך |
   |-----|-----|
   | Name | `taskflow-pro-api` |
   | Region | `Frankfurt (EU Central)` |
   | Branch | `main` |
   | Root Directory | השאירי ריק |
   | Runtime / Language | `Node` |
   | Build Command | `npm ci --include=dev && npm run build` |
   | Start Command | `npm run start:render` |
   | Instance Type | **Free** |

3. תחת **Environment Variables** לחצי **Add Environment Variable** לכל שורה:

   | Key | Value |
   |-----|-------|
   | `NODE_VERSION` | `22` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | כתובת החיבור מ־Neon |
   | `JWT_SECRET` | מחרוזת אקראית ארוכה (ראו למטה) |
   | `JWT_EXPIRES_IN` | `2h` |
   | `CORS_ORIGINS` | כתובת אתר ה־React, או זמנית `http://localhost:5173` |
   | `SEED_ADMIN_EMAIL` | `admin@taskflow.test` |
   | `SEED_ADMIN_PASSWORD` | סיסמה, לפחות 10 תווים |
   | `SEED_EMPLOYEE_PASSWORD` | סיסמה, לפחות 10 תווים |

   ליצירת `JWT_SECRET`: ליד שדה הערך יש בדרך כלל כפתור **Generate**. אם אין, הריצי במחשב:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
4. תחת **Advanced**, בשדה **Health Check Path**, כתבי: `/api/health`.
5. לחצי **Create Web Service** / **Deploy Web Service**.

### 7. Prisma Migrations
**אין צורך לעשות משהו ידנית.** פקודת ההפעלה `npm run start:render` מריצה לבד, בכל הפעלה:
1. `prisma migrate deploy`, שיוצר או מעדכן את הטבלאות.
2. Seed, **רק אם המסד ריק**. הוא יוצר מנהל, 2 עובדים, 3 פרויקטים ו־12 משימות עם הסיסמאות שהגדרת. בהפעלות הבאות הוא מדלג, ואף פעם לא מוחק נתונים.
3. הפעלת השרת.

### 8. Deploy
Render מתחיל לבנות מייד. בלשונית **Logs** תראי את ההתקדמות. זה לוקח בערך 3–6 דקות. בסוף אמורות להופיע השורות:
```
All migrations have been successfully applied.
[seed] Done:
[server] TaskFlow Pro API running on port 10000 (production)
```
ולמעלה יופיע סטטוס **Live** 🟢.

כל שינוי שתעלי ל־GitHub יגרום ל־Deploy חדש אוטומטית.

### 9. בדיקה שהשרת פעיל
בראש עמוד השירות מופיעה כתובת כמו `https://taskflow-pro-api.onrender.com`. זו כתובת השרת שלך. המשיכי לחלק ד.

---

## חלק ד — בדיקה שהכול עובד

החליפי את `YOUR-APP` בשם השרת שלך.

1. **בדיקת תקינות:** פתחי `https://YOUR-APP.onrender.com/api/health`.
   אמור להופיע: `{"status":"ok","database":"ok",...}`.
   אם מופיע `"database":"error"`, ראי פתרון תקלות.
2. **Swagger:** פתחי `https://YOUR-APP.onrender.com/api-docs`.
3. **התחברות מתוך Swagger:** פתחי את **POST /api/auth/login**, לחצי **Try it out**, ובתיבה כתבי:
   ```json
   { "email": "admin@taskflow.test", "password": "הסיסמה-שהגדרת-ב-SEED_ADMIN_PASSWORD" }
   ```
   ולחצי **Execute**.
4. **קבלת JWT:** בתשובה (קוד 200) העתיקי את הערך של `token`, בלי המירכאות.
5. **Authorize:** לחצי על הכפתור **Authorize** 🔓 למעלה מימין, הדביקי את הטוקן (בלי המילה Bearer), ולחצי **Authorize** ואז **Close**.
6. **קריאה מוגנת:** פתחי **GET /api/auth/me**, ואז **Try it out** ו־**Execute**. תקבלי את פרטי המנהל.
   - כדי לראות 401: לחצי **Authorize**, ואז **Logout**, והריצי שוב. תקבלי `401`.
   - כדי לראות 403: התחברי כעובדת (`noa@taskflow.test` עם הסיסמה מ־`SEED_EMPLOYEE_PASSWORD`), שימי את הטוקן שלה ב־Authorize, ונסי **GET /api/users**. תקבלי `403`.
7. **הוספת רשומה:** כמנהל, פתחי **POST /api/tasks**, ואז **Try it out**, והשאירי את הדוגמה (או שני את הכותרת). לחצי **Execute**. תקבלי `201` ואת המשימה החדשה עם `id`.
8. **שליפת הרשומה ממסד הנתונים:** פתחי **GET /api/tasks/{id}**, ואז **Try it out**, כתבי את ה־`id` שקיבלת ולחצי **Execute**. המשימה חוזרת מהמסד.
   אפשר גם לראות אותה ב־Neon: **Tables**, ואז `tasks`.

---

## חלק ה — פתרון תקלות

| תקלה | איך מזהים | פתרון |
|------|-----------|-------|
| **Build Failed** | ב־Logs מופיע `npm ERR!` או `error TS` | ודאי ש־`package.json` ו־`package-lock.json` נמצאים **בשורש** ה־Repository ולא בתוך תיקייה. ודאי שה־Build Command הוא בדיוק `npm ci --include=dev && npm run build` |
| `Cannot find module 'typescript'` / `tsc: not found` | ב־Build | חסר `--include=dev` ב־Build Command |
| **DATABASE_URL שגוי** | `[config] Invalid environment variables: DATABASE_URL` או `P1001: Can't reach database server` | העתיקי שוב את הכתובת מ־Neon. היא צריכה להתחיל ב־`postgresql://` ולהסתיים ב־`?sslmode=require`. בלי רווחים ובלי מירכאות |
| `P1000: Authentication failed` | סיסמה שגויה בכתובת | ב־Neon אפסי את הסיסמה, העתיקי כתובת חדשה ועדכני ב־Render (**Environment**, ואז **Save Changes**) |
| **בעיית Prisma** (`P3009`, `migrate found failed migrations`) | ב־Logs בזמן ההפעלה | Migration נכשל באמצע. הכי פשוט: ב־Neon מחקי את ה־Database וצרי חדש (או **Branches**, ואז **Reset**), ואז ב־Render **Manual Deploy**, ואז **Deploy latest commit** |
| `channel_binding` / שגיאת TLS | ב־Logs | מחקי מהכתובת את `&channel_binding=require` |
| **JWT_SECRET חסר** | `JWT_SECRET is required` או `must be at least 32 characters` | הוסיפי `JWT_SECRET` באורך 32 תווים לפחות, ואז **Save Changes** |
| **שגיאת CORS** | בדפדפן של אתר ה־React מופיע `blocked by CORS policy` | ב־`CORS_ORIGINS` כתבי בדיוק את כתובת אתר ה־React, עם `https://` ובלי `/` בסוף. כמה כתובות מפרידים בפסיק. אחרי השמירה Render מפעיל מחדש |
| **401 Unauthorized** | כל בקשה מחזירה 401 | לא שלחת טוקן, הוא פג תוקף (`TOKEN_EXPIRED`, אחרי שעתיים) או בוטל ב־logout (`TOKEN_REVOKED`). התחברי מחדש. ב־Swagger הדביקי בלי המילה Bearer |
| **403 Forbidden** | מחובר אבל "אין הרשאה" | זו התנהגות נכונה. למשל, עובד לא יכול ליצור משימה. התחברי כמנהל |
| לא מצליחה להתחבר עם `Admin123!` בענן | 401 | בענן הסיסמאות הן מה שהגדרת ב־`SEED_ADMIN_PASSWORD` / `SEED_EMPLOYEE_PASSWORD`. סיסמאות ההדגמה הידועות עובדות רק במחשב |
| הוספתי סיסמאות Seed אחרי ה־Deploy הראשון | אין משתמשים | ה־Seed רץ רק כשאין משתמשים. אם בהפעלה הראשונה חסרו סיסמאות, הוא דילג. הוסיפי אותן ולחצי **Manual Deploy**, והוא ירוץ |
| **Swagger לא נפתח** | עמוד לבן או 404 | ודאי שהכתובת היא `/api-docs` (עם מקף). חכי דקה אם השרת "התעורר". נסי `/api-docs.json` |
| **השרת לא עולה** | סטטוס `Deploy failed` / `Exited with status 1` | קראי את ה־Logs מלמטה למעלה. השרת מדפיס בדיוק איזה משתנה חסר. הסיבות הנפוצות: `DATABASE_URL` או `JWT_SECRET` |
| הבקשה הראשונה איטית מאוד | 30–60 שניות | השרת החינמי "נרדם". זה תקין, הבקשות הבאות מהירות |
| `"database":"error"` ב־health | השרת עלה אבל אין חיבור למסד | בדקי את `DATABASE_URL`. ב־Neon ודאי שהפרויקט פעיל ולא הגיע למגבלת השימוש החינמית |

---

## ועוד דבר: העלאת צד ה־React

לפי דרישות הפרויקט צריך להעלות גם את ה־Client. ב־Render: **New +**, ואז **Static Site**, ובחרי את ה־Repository של ה־React (Build Command בדרך כלל `npm ci && npm run build`, ו־Publish Directory בדרך כלל `dist` ב־Vite).
אחרי שתקבלי את כתובת האתר (למשל `https://taskflow-client.onrender.com`), עדכני ב־Render, בשירות **השרת**, את `CORS_ORIGINS` לכתובת הזו.
את כתובת השרת הגדירי בצד ה־React (ראי [FRONTEND-API-GUIDE.md](FRONTEND-API-GUIDE.md)).

---

## הפעלה במחשב שלך (לא חובה)

ראי [README.md](README.md), בחלק "הפעלה מקומית". בקצרה:
```
npm install
copy .env.example .env
npm run db:local        (בחלון נפרד, להשאיר פתוח)
npm run db:migrate
npm run db:seed
npm run dev
```
ואז לפתוח <http://localhost:4000/api-docs>.
