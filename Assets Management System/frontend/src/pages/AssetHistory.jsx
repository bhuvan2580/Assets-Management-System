import { useEffect, useState } from "react";

import {
    Search,
    History,
    Trash2,
    Laptop,
    Monitor,
    Keyboard,
    Package,
    X
} from "lucide-react";

import api from "../services/api";


function AssetHistory() {

    const [history, setHistory] = useState([]);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);

    const [deletingHistory, setDeletingHistory] =
        useState(null);


    const loadHistory = async () => {

        try {

            setLoading(true);

            const response =
                await api.get(
                    "/assets/history",
                    {
                        params: {
                            search:
                                search ||
                                undefined
                        }
                    }
                );

            setHistory(
                Array.isArray(response.data)
                    ? response.data
                    : []
            );

        } catch (error) {

            console.error(
                "Failed to load asset history:",
                error
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        const timer = setTimeout(
            loadHistory,
            300
        );

        return () =>
            clearTimeout(timer);

    }, [search]);


    const getIcon = (type) => {

        const value =
            type?.toLowerCase();

        if (
            value?.includes("laptop")
        ) {
            return Laptop;
        }

        if (
            value?.includes("monitor")
        ) {
            return Monitor;
        }

        if (
            value?.includes("keyboard")
        ) {
            return Keyboard;
        }

        return Package;
    };


    const formatDate = (date) => {

        if (!date) {
            return "—";
        }

        return new Date(
            date
        ).toLocaleDateString(
            "en-GB"
        );
    };


    const confirmDelete = async () => {

        if (!deletingHistory) {
            return;
        }

        try {

            await api.delete(
                `/assets/history/${deletingHistory.id}`
            );

            setHistory(
                previous =>
                    previous.filter(
                        item =>
                            item.id !==
                            deletingHistory.id
                    )
            );

            setDeletingHistory(null);

        } catch (error) {

            console.error(
                "Failed to delete history:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to delete asset history"
            );
        }
    };


    return (

        <div className="asset-history-page">

            {/* PAGE HEADER */}

            <div className="page-header">

                <div>

                    <h1>
                        Asset History
                    </h1>

                    <p>
                        View previously deleted IT assets
                    </p>

                </div>

            </div>


            {/* SEARCH */}

            <div className="history-toolbar">

                <div className="history-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search deleted assets..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />

                </div>

            </div>


            {/* CONTENT */}

            <div className="history-container">

                {loading ? (

                    <div className="history-empty">

                        <History size={40} />

                        <h3>
                            Loading asset history...
                        </h3>

                    </div>

                ) : history.length === 0 ? (

                    <div className="history-empty">

                        <History size={42} />

                        <h3>
                            No deleted assets
                        </h3>

                        <p>
                            Deleted assets will appear here.
                        </p>

                    </div>

                ) : (

                    <>

                        {/* DESKTOP TABLE */}

                        <div className="history-table-wrapper">

                            <table className="history-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Asset
                                        </th>

                                        <th>
                                            Type
                                        </th>

                                        <th>
                                            Serial Number
                                        </th>

                                        <th>
                                            Vendor
                                        </th>

                                        <th>
                                            Received Date
                                        </th>

                                        <th>
                                            Deleted Date
                                        </th>

                                        <th>
                                            Action
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {history.map(
                                        (item) => {

                                            const Icon =
                                                getIcon(
                                                    item.asset_type
                                                );

                                            return (

                                                <tr
                                                    key={
                                                        item.id
                                                    }
                                                >

                                                    <td>

                                                        <div className="history-asset">

                                                            <div className="history-icon">

                                                                <Icon
                                                                    size={18}
                                                                />

                                                            </div>

                                                            <div>

                                                                <strong>
                                                                    {
                                                                        item.asset_tag
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    {
                                                                        item.brand
                                                                    }{" "}
                                                                    {
                                                                        item.model
                                                                    }
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>


                                                    <td>
                                                        {
                                                            item.asset_type ||
                                                            "—"
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            item.serial_number ||
                                                            "—"
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            item.vendor_name ||
                                                            "—"
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            formatDate(
                                                                item.received_date
                                                            )
                                                        }
                                                    </td>


                                                    <td>
                                                        {item.deleted_at
                                                            ? formatDate(item.deleted_at)
                                                            : "—"
                                                        }
                                                    </td>


                                                    <td>

                                                        <button
                                                            className="history-delete-button"
                                                            onClick={() =>
                                                                setDeletingHistory(
                                                                    item
                                                                )
                                                            }
                                                            title="Delete history record"
                                                        >

                                                            <Trash2
                                                                size={16}
                                                            />

                                                            Delete

                                                        </button>

                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>


                        {/* MOBILE CARDS */}

                        <div className="history-mobile-cards">

                            {history.map(
                                (item) => {

                                    const Icon =
                                        getIcon(
                                            item.asset_type
                                        );

                                    return (

                                        <div
                                            className="history-card"
                                            key={
                                                item.id
                                            }
                                        >

                                            <div className="history-card-header">

                                                <div className="history-card-title">

                                                    <div className="history-icon">

                                                        <Icon
                                                            size={18}
                                                        />

                                                    </div>

                                                    <div>

                                                        <strong>
                                                            {
                                                                item.asset_tag
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                item.brand
                                                            }{" "}
                                                            {
                                                                item.model
                                                            }
                                                        </span>

                                                    </div>

                                                </div>

                                            </div>


                                            <div className="history-card-details">

                                                <div>
                                                    <span>
                                                        Type
                                                    </span>

                                                    <strong>
                                                        {
                                                            item.asset_type ||
                                                            "—"
                                                        }
                                                    </strong>
                                                </div>


                                                <div>
                                                    <span>
                                                        Serial Number
                                                    </span>

                                                    <strong>
                                                        {
                                                            item.serial_number ||
                                                            "—"
                                                        }
                                                    </strong>
                                                </div>


                                                <div>
                                                    <span>
                                                        Vendor
                                                    </span>

                                                    <strong>
                                                        {
                                                            item.vendor_name ||
                                                            "—"
                                                        }
                                                    </strong>
                                                </div>


                                                <div>
                                                    <span>
                                                        Location
                                                    </span>

                                                    <strong>
                                                        {
                                                            item.location ||
                                                            "—"
                                                        }
                                                    </strong>
                                                </div>


                                                <div>
                                                    <span>
                                                        Received
                                                    </span>

                                                    <strong>
                                                        {
                                                            formatDate(
                                                                item.received_date
                                                            )
                                                        }
                                                    </strong>
                                                </div>


                                                <div>
                                                    <span>
                                                        Deleted
                                                    </span>

                                                    <strong>
                                                        {
                                                            formatDate(
                                                                item.created_at
                                                            )
                                                        }
                                                    </strong>
                                                </div>

                                            </div>


                                            <button
                                                className="history-delete-button mobile"
                                                onClick={() =>
                                                    setDeletingHistory(
                                                        item
                                                    )
                                                }
                                            >

                                                <Trash2
                                                    size={16}
                                                />

                                                Delete History

                                            </button>

                                        </div>

                                    );

                                }
                            )}

                        </div>

                    </>

                )}

            </div>


            {/* DELETE MODAL */}

            {deletingHistory && (

                <div className="modal-overlay">

                    <div className="delete-modal">

                        <div className="delete-icon">

                            <Trash2 size={22} />

                        </div>


                        <h2>
                            Delete History Record?
                        </h2>


                        <p>

                            Are you sure you want to permanently
                            delete the history record for{" "}

                            <strong>
                                {
                                    deletingHistory.asset_tag
                                }
                            </strong>
                            ?

                        </p>


                        <p className="delete-warning">

                            This will permanently remove this
                            historical record.

                        </p>


                        <div className="modal-footer">

                            <button
                                className="cancel-button"
                                onClick={() =>
                                    setDeletingHistory(
                                        null
                                    )
                                }
                            >
                                Cancel
                            </button>


                            <button
                                className="delete-button"
                                onClick={
                                    confirmDelete
                                }
                            >

                                <Trash2
                                    size={16}
                                />

                                Delete

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );
}


export default AssetHistory;