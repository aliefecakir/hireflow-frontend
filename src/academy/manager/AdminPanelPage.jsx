import { useEffect, useMemo, useState } from 'react'
import { Search, Shield, Users } from 'lucide-react'
import { getErrorMessage } from '../../shared/api/client'
import { roleLabel } from '../../shared/api/auth'
import { listActiveRoles, listUserRoles, updateUserRole } from '../../shared/api/users'
import { useAuth } from '../../shared/AuthContext'
import { showToast } from '../../shared/toast/ToastProvider'
import { DEFAULT_PAGE_SIZE } from '../api/helpers'
import {
  ConfirmDialog,
  displayName,
  inputClass,
  LoadingState,
  paginateRows,
  TablePager,
} from './ui'

function foldText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

function userFullName(row) {
  return displayName({ firstName: row?.firstName, lastName: row?.lastName }) || row?.email || 'Kullanıcı'
}

export default function AdminPanelPage() {
  const { userProfile, reloadUserProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState(null)
  const [pendingSave, setPendingSave] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const [userRows, roleRows] = await Promise.all([listUserRoles(), listActiveRoles()])
        if (cancelled) return
        const nextUsers = Array.isArray(userRows) ? userRows : []
        const nextRoles = Array.isArray(roleRows) ? roleRows : []
        setUsers(nextUsers)
        setRoles(nextRoles)
        setDrafts(Object.fromEntries(nextUsers.map((row) => [row.userId, row.roleShrtCode || ''])))
      } catch (error) {
        console.error('Kullanıcı rolleri yüklenemedi:', error)
        if (!cancelled) {
          setUsers([])
          setRoles([])
          showToast.error('Hata Oluştu', getErrorMessage(error) || 'Kullanıcı listesi yüklenirken bir hata oluştu.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const query = foldText(search)
    if (!query) return users
    return users.filter((row) => {
      const haystack = [
        row.firstName,
        row.lastName,
        row.email,
        row.roleName,
        row.roleShrtCode,
        roleLabel(row.roleShrtCode),
      ]
        .map(foldText)
        .join(' ')
      return haystack.includes(query)
    })
  }, [users, search])

  const pagedUsers = paginateRows(filteredUsers, page, pageSize)

  const roleOptionsFor = (row) => {
    const options = [...roles]
    if (
      row?.roleShrtCode &&
      !options.some((role) => String(role.shrtCode) === String(row.roleShrtCode))
    ) {
      options.unshift({
        roleId: row.roleId,
        name: row.roleName || roleLabel(row.roleShrtCode),
        shrtCode: row.roleShrtCode,
      })
    }
    return options
  }

  const requestSave = (row) => {
    const nextCode = drafts[row.userId]
    if (!nextCode || nextCode === row.roleShrtCode || savingUserId) return
    const selected = roleOptionsFor(row).find((role) => String(role.shrtCode) === String(nextCode))
    setPendingSave({
      row,
      shrtCode: nextCode,
      label: selected?.name || roleLabel(nextCode) || nextCode,
    })
  }

  const confirmSave = async () => {
    const pending = pendingSave
    if (!pending?.row?.userId) return
    setPendingSave(null)
    setSavingUserId(pending.row.userId)
    try {
      const updated = await updateUserRole(pending.row.userId, { shrtCode: pending.shrtCode })
      setUsers((prev) =>
        prev.map((row) => (row.userId === updated.userId ? { ...row, ...updated } : row)),
      )
      setDrafts((prev) => ({ ...prev, [updated.userId]: updated.roleShrtCode || pending.shrtCode }))
      showToast.success('Başarılı', 'Kullanıcı rolü güncellendi.')
      if (String(userProfile?.userId) === String(pending.row.userId)) {
        await reloadUserProfile?.()
      }
    } catch (error) {
      console.error('Kullanıcı rolü güncellenemedi:', error)
      showToast.error('Hata Oluştu', getErrorMessage(error) || 'Rol güncellenirken bir hata oluştu.')
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Paneli</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kullanıcıların rollerini aktif sistem rolleri arasından güncelleyin.
        </p>
        <label className="relative mt-4 block w-full sm:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-3rem)/3)]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Ad, e-posta veya role göre ara"
            className={`pl-9 ${inputClass}`}
            aria-label="Kullanıcı ara"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState label="Kullanıcılar yükleniyor..." />
        ) : users.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-400" />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-700">Kullanıcı bulunamadı</p>
            <p className="mt-1 text-sm text-slate-500">USER_ROLE tablosunda listelenecek kayıt yok.</p>
          </div>
        ) : pagedUsers.total === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-700">Bu aramaya uygun kullanıcı yok</p>
            <p className="mt-1 text-sm text-slate-500">Farklı bir değer arayın veya aramayı temizleyin.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Ad</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Soyad</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">E-posta</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Rol</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-700" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedUsers.items.map((row) => {
                    const selected = drafts[row.userId] ?? row.roleShrtCode ?? ''
                    const dirty = selected !== (row.roleShrtCode || '')
                    const saving = savingUserId === row.userId
                    return (
                      <tr key={row.userId} className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-slate-700">{row.firstName || '—'}</td>
                        <td className="px-5 py-4 text-slate-700">{row.lastName || '—'}</td>
                        <td className="px-5 py-4 text-slate-700">{row.email || '—'}</td>
                        <td className="px-5 py-4">
                          <select
                            value={selected}
                            onChange={(event) => {
                              setDrafts((prev) => ({ ...prev, [row.userId]: event.target.value }))
                            }}
                            disabled={saving}
                            className="w-full min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            aria-label={`${userFullName(row)} rolü`}
                          >
                            <option value="">Seçiniz</option>
                            {roleOptionsFor(row).map((role) => (
                              <option key={role.shrtCode || role.roleId} value={role.shrtCode}>
                                {role.name || roleLabel(role.shrtCode) || role.shrtCode}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => requestSave(row)}
                            disabled={!dirty || !selected || saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Shield className="h-4 w-4" />
                            {saving ? 'Kaydediliyor...' : 'Güncelle'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <TablePager
              page={pagedUsers.page}
              size={pageSize}
              total={pagedUsers.total}
              onPageChange={setPage}
              onSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </>
        )}
      </div>

      {pendingSave ? (
        <ConfirmDialog
          title="Rolü güncelle"
          message={`${userFullName(pendingSave.row)} kullanıcısının rolü "${pendingSave.label}" olarak değiştirilecek. Emin misiniz?`}
          confirmLabel="Evet"
          cancelLabel="Hayır"
          onCancel={() => setPendingSave(null)}
          onConfirm={confirmSave}
        />
      ) : null}
    </div>
  )
}
