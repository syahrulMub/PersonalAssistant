import React, { useState, useEffect } from "react";
import { formatDateOnly } from "../context/DateFormat";
import { FaUserPlus, FaUserCheck, FaTrash } from "react-icons/fa";

export function UserActivation() {
  const [user, setUser] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Mengambil data dari backend dengan pagination
  const fetchUsers = async (currentPage = page, currentPageSize = pageSize) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/user?page=${currentPage}&pageSize=${currentPageSize}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) {
        throw new Error("Gagal mengambil data dari server.");
      }
      const data = await response.json();

      if (data && data.items) {
        setUser(data.items);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || currentPage);
      } else if (Array.isArray(data)) {
        setUser(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch setiap kali halaman (page) atau ukuran halaman (pageSize) berubah
  useEffect(() => {
    fetchUsers(page, pageSize);
  }, [page, pageSize]);

  // Approve user
  const approveUser = async (id, fullname) => {
    if (
      !window.confirm(`Apakah Anda yakin ingin mengapprove user "${fullname}"?`)
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/user/approve/${id}`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        fetchUsers(page, pageSize);
      } else {
        alert(data.message || "Gagal mengapprove user.");
      }
    } catch (err) {
      console.error("Error approving user:", err);
      alert("Terjadi kesalahan saat mengapprove user.");
    }
  };

  // Hapus user
  const deleteUser = async (id, fullname) => {
    if (
      !window.confirm(`Apakah Anda yakin ingin menghapus user "${fullname}"?`)
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/user/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Jika item di halaman saat ini tinggal 1 dan bukan halaman 1, mundur ke halaman sebelumnya
        if (user.length === 1 && page > 1) {
          setPage((prev) => prev - 1);
        } else {
          fetchUsers(page, pageSize);
        }
      } else {
        alert(data.message || "Gagal menghapus user.");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Terjadi kesalahan saat menghapus user.");
    }
  };

  // Helper untuk navigasi halaman
  const handlePrevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(1); // Reset ke halaman 1 saat pageSize berubah
  };

  // Hitung range item yang sedang ditampilkan
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="container py-4">
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error}</div>}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat data user...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "5%" }}>No</th>
                    <th style={{ width: "25%" }}>Fullname</th>
                    <th style={{ width: "25%" }}>Email</th>
                    <th style={{ width: "15%" }}>Approved</th>
                    <th style={{ width: "18%" }}>Create At</th>
                    <th style={{ width: "12%" }} className="text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {user.map((item, index) => (
                    <tr key={item.id}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td className="fw-semibold text-dark">{item.fullName}</td>
                      <td>{item.email}</td>
                      <td>
                        {item.isApproved ? (
                          <span className="badge bg-success-subtle text-success border border-success px-2 py-1">
                            Approved
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning border border-warning px-2 py-1">
                            Not yet
                          </span>
                        )}
                      </td>
                      <td className="text-muted small">
                        {formatDateOnly(item.createdAt)}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center align-items-center gap-2">
                          {item.isApproved ? (
                            <button
                              className="btn btn-sm btn-outline-success p-1 px-2 rounded-circle"
                              disabled
                              title="Sudah di-approve"
                              style={{
                                width: "32px",
                                height: "32px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "default",
                                opacity: 0.85,
                              }}
                            >
                              <FaUserCheck />
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-primary p-1 px-2 rounded-circle"
                              onClick={() =>
                                approveUser(item.id, item.fullName)
                              }
                              title="Approve User"
                              style={{
                                width: "32px",
                                height: "32px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FaUserPlus />
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline-danger p-1 px-2 rounded-circle"
                            onClick={() => deleteUser(item.id, item.fullName)}
                            title="Hapus User"
                            style={{
                              width: "32px",
                              height: "32px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER PAGINATION */}
        {!loading && totalCount > 0 && (
          <div className="card-footer bg-white border-top py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
            {/* Informasi Rentang Data & Pengaturan Ukuran Halaman */}
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted small">
                Menampilkan <strong>{startItem}</strong> -{" "}
                <strong>{endItem}</strong> dari <strong>{totalCount}</strong>{" "}
                user
              </span>
              <div className="d-flex align-items-center gap-1">
                <span className="text-muted small">Baris:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "70px" }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            {/* Navigasi Halaman (Previous, Numbers, Next) */}
            <nav aria-label="Navigasi Halaman">
              <ul className="pagination pagination-sm mb-0">
                {/* Tombol Previous */}
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={handlePrevPage}
                    disabled={page <= 1}
                    aria-label="Sebelumnya"
                  >
                    &laquo; Prev
                  </button>
                </li>

                {/* Nomor-nomor Halaman */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <li
                      key={pageNum}
                      className={`page-item ${page === pageNum ? "active" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ),
                )}

                {/* Tombol Next */}
                <li
                  className={`page-item ${page >= totalPages ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                    aria-label="Berikutnya"
                  >
                    Next &raquo;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserActivation;
