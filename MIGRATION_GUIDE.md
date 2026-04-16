# Firebase → Supabase Migration Guide

## Completed Files ✅

1. `src/config/supabase.js` - Supabase client initialization
2. `src/utils/authUtils.js` - Whitelist check updated
3. `src/App.jsx` - Auth listener + cycle loading
4. `src/components/auth/Login.jsx` - Google OAuth
5. `src/components/dashboard/Dashboard.jsx` - Logout + cycles
6. `src/components/cycles/CycleManager.jsx` - Cycle CRUD
7. `src/components/import/ImportStudents.jsx` - CSV import
8. `.github/workflows/deploy.yml` - CI/CD workflow
9. `.env.example`, `package.json`, `vite.config.js` - Config files

## Remaining Files to Migrate

### Pattern: Real-Time Data with Updates

All the following files use the same pattern:
- **Firebase**: `onSnapshot` → initial + changes
- **Supabase**: Initial `select()` + `channel().on('postgres_changes')`

### 1. StudentsList.jsx

**Replace import:**
```javascript
// OLD
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'

// NEW
import { supabase } from '../../config/supabase'
```

**Replace useEffect (lines 54-68):**
```javascript
// NEW CODE
useEffect(() => {
  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('cycle_year', cycle)
      .order('apellido')

    if (error) {
      console.error('Error loading students:', error)
      return
    }

    setStudents(data.map(s => ({
      ...s,
      docId: s.id  // Map 'id' field to 'docId' for compatibility
    })))
  }

  loadStudents()

  // Subscribe to real-time changes
  const channel = supabase
    .channel(`students:${cycle}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'students',
        filter: `cycle_year=eq.${cycle}`
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setStudents(prev => {
            const idx = prev.findIndex(s => s.id === payload.new.id)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = { ...payload.new, docId: payload.new.id }
              return updated
            }
            return [...prev, { ...payload.new, docId: payload.new.id }]
          })
        } else if (payload.eventType === 'DELETE') {
          setStudents(prev => prev.filter(s => s.id !== payload.old.id))
        }
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}, [cycle])
```

**Replace updateDoc call (line ~34):**
```javascript
// OLD
const studentRef = doc(db, 'cycles', cycle, 'students', editingStudent.docId)
await updateDoc(studentRef, updatedData)

// NEW
const { error } = await supabase
  .from('students')
  .update(updatedData)
  .eq('id', editingStudent.docId)
  .eq('cycle_year', cycle)

if (error) throw error
```

---

### 2. GradeUpload.jsx

**Replace imports:**
```javascript
// OLD
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'

// NEW
import { supabase } from '../../config/supabase'
```

**Replace student lookup (around line 80):**
```javascript
// OLD
const studentsRef = collection(db, 'cycles', cycle, 'students')
const q = query(studentsRef, where('id', '==', studentId))
const snapshot = await getDocs(q)
const student = snapshot.docs[0]

// NEW
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('id', studentId)
  .eq('cycle_year', cycle)
  .single()

if (error) throw error
const student = data
```

**Replace grade save (around line 100):**
```javascript
// OLD
await updateDoc(doc(db, 'cycles', cycle, 'students', studentDocId), {
  ['grades.' + selectedExam]: valueToSave
})

// NEW
const { data: current } = await supabase
  .from('students')
  .select('grades')
  .eq('id', studentDocId)
  .eq('cycle_year', cycle)
  .single()

const updatedGrades = {
  ...current.grades,
  [selectedExam]: valueToSave
}

const { error } = await supabase
  .from('students')
  .update({ grades: updatedGrades })
  .eq('id', studentDocId)
  .eq('cycle_year', cycle)

if (error) throw error
```

---

### 3. GradeBoard.jsx

**Replace imports and use pattern:**
Same as StudentsList - replace `onSnapshot` with initial `select()` + `channel().on('postgres_changes')`.

Key difference: inline grade edits use the same grade update pattern as GradeUpload.

---

### 4. ReportsManager.jsx

**Replace imports:**
```javascript
// NEW
import { supabase } from '../../config/supabase'
```

**Replace onSnapshot (real-time read only):**
```javascript
// Pattern: Initial load + subscribe
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('cycle_year', cycle)

setStudents(data)

const channel = supabase
  .channel(`students:${cycle}`)
  .on('postgres_changes', { ... }, (payload) => {
    // Update setStudents
  })
  .subscribe()
```

No writes needed - just consume real-time updates.

---

### 5. MeritOrder.jsx

**Same pattern as ReportsManager** - real-time read only.

Replace `onSnapshot` with initial `select()` + subscribe pattern.

---

## Important Notes

### Composite Primary Key
Students have PK `(id, cycle_year)`. When querying/updating, always include BOTH:
```javascript
.eq('id', studentId)
.eq('cycle_year', cycle)
```

### Real-Time Subscription Pattern
```javascript
const channel = supabase
  .channel(`students:${cycle}`)  // Unique channel name
  .on('postgres_changes', {
    event: '*',  // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'students',
    filter: `cycle_year=eq.${cycle}`  // CRITICAL: filter by cycle
  }, handleChange)
  .subscribe()

// In cleanup:
return () => channel.unsubscribe()
```

### Grade Updates (jsonb merge)
Always read current grades before updating to avoid lost updates:
```javascript
const current = await supabase.from('students').select('grades').eq(...).single()
const updated = { ...current.grades, [examKey]: value }
await supabase.from('students').update({ grades: updated }).eq(...)
```

---

## Testing Checklist After Migration

- [ ] Login with Google auth works
- [ ] Whitelist check prevents unauthorized access
- [ ] Can create/archive cycles
- [ ] Can import students from CSV
- [ ] Real-time student list updates in multiple tabs
- [ ] Can edit student names/dni/etc
- [ ] Can upload grades via barcode scanner
- [ ] Grade updates reflected in real-time
- [ ] PDF reports generate correctly
- [ ] Excel merit order export works
- [ ] All forms save without errors

## Commands

```bash
# Install dependencies (replaces firebase with supabase)
npm install

# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```
