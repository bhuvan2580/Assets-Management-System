import { useState } from "react";

import {
    Package,
    Send,
    RefreshCw,
    CheckCircle,
    X
} from "lucide-react";

import api from "../services/api";


function AvailableAssets() {

    // ============================================================
    // ASSET OPTIONS
    // ============================================================

    const assetOptions = [
        "Laptop",
        "Monitor",
        "Mouse",
        "Charger",
        "Bag",
        "Pendrive",
        "Others"
    ];


    // ============================================================
    // REQUEST MODAL
    // ============================================================

    const [showRequestModal, setShowRequestModal] =
        useState(false);


    // ============================================================
    // FORM STATE
    // ============================================================

    const [requestedAsset, setRequestedAsset] =
        useState("");

    const [otherAsset, setOtherAsset] =
        useState("");

    const [remarks, setRemarks] =
        useState("");


    // ============================================================
    // UI STATE
    // ============================================================

    const [requestLoading, setRequestLoading] =
        useState(false);

    const [requestError, setRequestError] =
        useState("");

    const [successMessage, setSuccessMessage] =
        useState("");


    // ============================================================
    // OPEN REQUEST MODAL
    // ============================================================

    const openRequestModal = () => {

        setRequestedAsset("");
        setOtherAsset("");
        setRemarks("");
        setRequestError("");

        setShowRequestModal(true);
    };


    // ============================================================
    // CLOSE REQUEST MODAL
    // ============================================================

    const closeRequestModal = () => {

        if (requestLoading) {
            return;
        }

        setShowRequestModal(false);

        setRequestedAsset("");
        setOtherAsset("");
        setRemarks("");
        setRequestError("");
    };


    // ============================================================
    // SUBMIT REQUEST
    // ============================================================

    const handleRequest = async () => {

        setRequestError("");
        setSuccessMessage("");


        // --------------------------------------------------------
        // Validate asset type
        // --------------------------------------------------------

        if (!requestedAsset) {

            setRequestError(
                "Please select an asset type."
            );

            return;
        }


        // --------------------------------------------------------
        // Determine final requested asset
        // --------------------------------------------------------

        let finalAsset = requestedAsset;


        if (requestedAsset === "Others") {

            finalAsset = otherAsset.trim();


            if (!finalAsset) {

                setRequestError(
                    "Please specify the asset you want."
                );

                return;
            }
        }


        // --------------------------------------------------------
        // Submit request
        // --------------------------------------------------------

        try {

            setRequestLoading(true);

            const response = await api.post(
                "/asset-requests",
                {
                    requested_asset: finalAsset,
                    remarks: remarks.trim() || null
                }
            );


            // ----------------------------------------------------
            // Success
            // ----------------------------------------------------

            if (response.data?.success) {

                setSuccessMessage(
                    `Request for ${finalAsset} submitted successfully.`
                );

                setShowRequestModal(false);

                setRequestedAsset("");
                setOtherAsset("");
                setRemarks("");
                setRequestError("");

            } else {

                setRequestError(
                    response.data?.message ||
                    "Unable to submit asset request."
                );
            }

        } catch (error) {

            console.error(
                "Failed to submit asset request:",
                error
            );

            setRequestError(
                error.response?.data?.message ||
                "Unable to submit asset request."
            );

        } finally {

            setRequestLoading(false);
        }
    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="employee-assets-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="employee-assets-header">

                <div>

                    <p className="employee-page-label">
                        Asset Management
                    </p>

                    <h1>
                        Request an Asset
                    </h1>

                    <p>
                        Submit a request for an asset you need.
                        The IT team will review your request
                        and assign an available asset.
                    </p>

                </div>

            </div>


            {/* =================================================
                SUCCESS MESSAGE
            ================================================= */}

            {successMessage && (

                <div className="employee-success-message">

                    <CheckCircle size={18} />

                    <span>
                        {successMessage}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setSuccessMessage("")
                        }
                    >
                        <X size={16} />
                    </button>

                </div>

            )}


            {/* =================================================
                REQUEST CARD
            ================================================= */}

            <div className="employee-assets-container">

                <div className="employee-request-empty-state">

                    <div className="employee-request-empty-icon">

                        <Package size={44} />

                    </div>

                    <h2>
                        Need an Asset?
                    </h2>

                    <p>
                        Select the type of asset you need
                        and submit a request to the IT team.
                    </p>

                    <button
                        type="button"
                        className="employee-request-asset-button"
                        onClick={openRequestModal}
                    >

                        <Send size={17} />

                        Request an Asset

                    </button>

                </div>

            </div>


            {/* =================================================
                REQUEST MODAL
            ================================================= */}

            {showRequestModal && (

                <div
                    className="employee-request-modal-overlay"
                    onClick={closeRequestModal}
                >

                    <div
                        className="employee-request-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* -------------------------------------
                            CLOSE BUTTON
                        ------------------------------------- */}

                        <button
                            type="button"
                            className="employee-request-modal-close"
                            onClick={closeRequestModal}
                            disabled={requestLoading}
                        >

                            <X size={20} />

                        </button>


                        {/* -------------------------------------
                            MODAL ICON
                        ------------------------------------- */}

                        <div className="employee-request-modal-icon">

                            <Send size={22} />

                        </div>


                        {/* -------------------------------------
                            TITLE
                        ------------------------------------- */}

                        <h2>
                            Request an Asset
                        </h2>

                        <p>
                            Tell the IT team which asset
                            you need.
                        </p>


                        {/* -------------------------------------
                            FORM
                        ------------------------------------- */}

                        <div className="employee-request-form">


                            {/* =================================
                                ASSET TYPE
                            ================================= */}

                            <div className="employee-form-group">

                                <label htmlFor="requested-asset">

                                    Asset Type

                                    <span className="required">
                                        *
                                    </span>

                                </label>

                                <select
                                    id="requested-asset"
                                    value={requestedAsset}
                                    onChange={(e) => {

                                        setRequestedAsset(
                                            e.target.value
                                        );

                                        setOtherAsset("");

                                        setRequestError("");
                                    }}
                                    disabled={requestLoading}
                                >

                                    <option value="">
                                        Select asset type
                                    </option>

                                    {assetOptions.map(
                                        (asset) => (

                                            <option
                                                key={asset}
                                                value={asset}
                                            >
                                                {asset}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* =================================
                                OTHER ASSET
                            ================================= */}

                            {requestedAsset === "Others" && (

                                <div className="employee-form-group">

                                    <label htmlFor="other-asset">

                                        Specify Asset

                                        <span className="required">
                                            *
                                        </span>

                                    </label>

                                    <input
                                        id="other-asset"
                                        type="text"
                                        value={otherAsset}
                                        onChange={(e) => {

                                            setOtherAsset(
                                                e.target.value
                                            );

                                            setRequestError("");
                                        }}
                                        placeholder="Enter the asset you need"
                                        maxLength={255}
                                        disabled={requestLoading}
                                    />

                                </div>

                            )}


                            {/* =================================
                                REMARKS
                            ================================= */}

                            <div className="employee-form-group">

                                <label htmlFor="request-remarks">

                                    Remarks

                                    <span className="optional">
                                        Optional
                                    </span>

                                </label>

                                <textarea
                                    id="request-remarks"
                                    value={remarks}
                                    onChange={(e) =>
                                        setRemarks(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Tell the IT team why you need this asset..."
                                    rows={4}
                                    maxLength={1000}
                                    disabled={requestLoading}
                                />

                            </div>


                            {/* =================================
                                ERROR
                            ================================= */}

                            {requestError && (

                                <div className="employee-request-error">

                                    {requestError}

                                </div>

                            )}


                            {/* =================================
                                ACTIONS
                            ================================= */}

                            <div className="employee-request-modal-actions">

                                <button
                                    type="button"
                                    className="employee-request-cancel"
                                    onClick={closeRequestModal}
                                    disabled={requestLoading}
                                >
                                    Cancel
                                </button>


                                <button
                                    type="button"
                                    className="employee-request-confirm"
                                    onClick={handleRequest}
                                    disabled={requestLoading}
                                >

                                    {requestLoading ? (

                                        <>
                                            <RefreshCw
                                                size={16}
                                                className="employee-spin"
                                            />

                                            Submitting...
                                        </>

                                    ) : (

                                        <>
                                            <Send size={16} />

                                            Submit Request
                                        </>

                                    )}

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}


export default AvailableAssets;