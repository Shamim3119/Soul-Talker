
import { useEffect, useMemo, useState } from 'react';
import api from '../../api/api';
import '../../styles/manage-user-access.css';

export default function ManageUserAccess({
  account,
  onClose,
  onSuccess,
}) {
  const [permissions, setPermissions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPermissions() {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(
          `/user-management/accounts/${account.id}/permissions`
        );

        if (!active) return;

        const items = response.data.data.permissions;

        setPermissions(items);
        setSelected(
          items
            .filter((item) => item.assigned)
            .map((item) => Number(item.id))
        );
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              'Unable to load permissions.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPermissions();

    return () => {
      active = false;
    };
  }, [account.id]);

  const groups = useMemo(() => {
    const map = new Map();

    for (const permission of permissions) {
      const moduleId = Number(permission.module_id);

      if (!map.has(moduleId)) {
        map.set(moduleId, []);
      }

      map.get(moduleId).push(permission);
    }

    return [...map.entries()]
      .map(([moduleId, items]) => ({
        moduleId,
        items,
        title:
          items[0]?.code
            ?.split('.')
            .slice(0, -1)
            .join(' / ')
            .replace(/-/g, ' ') || `Module ${moduleId}`,
      }))
      .filter((group) => {
        if (!search.trim()) return true;

        const query = search.toLowerCase();

        return (
          group.title.toLowerCase().includes(query) ||
          group.items.some(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.code.toLowerCase().includes(query)
          )
        );
      });
  }, [permissions, search]);

  const selectedSet = useMemo(
    () => new Set(selected),
    [selected]
  );

  const togglePermission = (id) => {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id]
    );
  };

  const toggleGroup = (items) => {
    const ids = items.map((item) => Number(item.id));

    setSelected((previous) => {
      const current = new Set(previous);
      const allSelected = ids.every((id) => current.has(id));

      if (allSelected) {
        ids.forEach((id) => current.delete(id));
      } else {
        ids.forEach((id) => current.add(id));
      }

      return [...current];
    });
  };

  const selectAll = () => {
    setSelected(permissions.map((item) => Number(item.id)));
  };

  const clearAll = () => {
    setSelected([]);
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      setError('');

      await api.put(
        `/user-management/accounts/${account.id}/permissions`,
        {
          permission_ids: [...selected].sort((a, b) => a - b),
        }
      );

      onSuccess?.('User permissions updated successfully.');
      onClose?.();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to save permissions.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mua-overlay">
      <div
        className="mua-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Manage User Access"
      >
        <div className="mua-header">
          <div>
            <h2>Manage User Access</h2>
            <p>
              Login ID: <strong>{account.user_id}</strong>
            </p>
          </div>

          <button
            type="button"
            className="mua-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mua-toolbar">
          <input
            type="search"
            placeholder="Search permissions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={loading || saving}
          />

          <button
            type="button"
            onClick={selectAll}
            disabled={loading || saving}
          >
            Select All
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={loading || saving}
          >
            Clear All
          </button>
        </div>

        <div className="mua-count">
          {selected.length} of {permissions.length} permissions selected
        </div>

        {error && (
          <div className="mua-error" role="alert">
            {error}
          </div>
        )}

        <div className="mua-content">
          {loading ? (
            <p>Loading permissions...</p>
          ) : (
            groups.map((group) => {
              const ids = group.items.map((item) => Number(item.id));
              const checked = ids.every((id) => selectedSet.has(id));
              const selectedCount = ids.filter((id) =>
                selectedSet.has(id)
              ).length;

              return (
                <section
                  key={group.moduleId}
                  className="mua-group"
                >
                  <div className="mua-group-header">
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={() => toggleGroup(group.items)}
                      />
                      <strong>{group.title}</strong>
                    </label>

                    <span>
                      {selectedCount}/{group.items.length}
                    </span>
                  </div>

                  <div className="mua-permissions">
                    {group.items
                      .filter(
                        (item) =>
                          !search.trim() ||
                          group.title
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          item.name
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          item.code
                            .toLowerCase()
                            .includes(search.toLowerCase())
                      )
                      .map((item) => (
                        <label
                          key={item.id}
                          className="mua-permission"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSet.has(
                              Number(item.id)
                            )}
                            disabled={saving}
                            onChange={() =>
                              togglePermission(Number(item.id))
                            }
                          />

                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.code}</small>
                          </span>
                        </label>
                      ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <div className="mua-footer">
          <button
            type="button"
            className="mua-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="mua-save"
            onClick={savePermissions}
            disabled={loading || saving || !!error}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
