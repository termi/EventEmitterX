'use strict';

import './AsyncSpinner.css';

export default function AsyncSpinner() {
    return (
        <span className="AsyncSpinnerLoader">
            <span className="AsyncSpinnerLoader__spinner"></span>
        </span>
    );
}
