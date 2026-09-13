import React, { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import { formatDateOnly } from "../context/DateFormat";
import { TiUserAdd } from "react-icons/ti";

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
      console.error("Error fetching activities:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch setiap kali halaman (page) atau ukuran halaman (pageSize) berubah
  useEffect(() => {
    fetchUsers(page, pageSize);
  }, [page, pageSize]);

  // Hapus aktivitas
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

      if (response.ok) {
        // Jika item di halaman saat ini tinggal 1 dan bukan halaman 1, mundur ke halaman sebelumnya
        if (user.length === 1 && page > 1) {
          setPage((prev) => prev - 1);
        } else {
          fetchUsers(page, pageSize);
        }
      } else {
        alert("Gagal menghapus aktivitas.");
      }
    } catch (err) {
      console.error("Error deleting activity:", err);
      alert("Terjadi kesalahan saat menghapus aktivitas.");
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
                    <th style={{ width: "3%" }}>No</th>
                    <th style={{ width: "25%" }}>Fullname</th>
                    <th style={{ width: "15%" }}>Email</th>
                    <th style={{ width: "30%" }}>Approved</th>
                    <th style={{ width: "30%" }}>Create At</th>
                    <th style={{ width: "10%" }} className="text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {user.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold text-dark">{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.isApproved ? "Approve" : "Not yet"}</td>
                      <td className="text-muted small">
                        {formatDateOnly(user.createdAt)}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-danger p-1 px-2 rounded-circle"
                          onClick={() => approveUser(user.id, user.fullName)}
                          title="Approve"
                          style={{
                            width: "32px",
                            height: "32px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <TiUserAdd />
                        </button>
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
                aktivitas
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
