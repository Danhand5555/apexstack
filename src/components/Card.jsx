import React from 'react';

const Card = ({ suit, value, hidden, style }) => {
    if (hidden) {
        return <div className="card card-hidden" style={style} />;
    }

    const isRed = suit === '♥' || suit === '♦';
    const colorClass = isRed ? 'red' : 'black';

    return (
        <div className={`card ${colorClass}`} style={style}>
            <div className="card-value-top">{value}</div>
            <div className="card-suit">{suit}</div>
            <div className="card-value-bottom">{value}</div>
        </div>
    );
};

export default Card;
