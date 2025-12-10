import React from 'react';

const Card = ({ suit, value, hidden }) => {
    if (hidden) {
        return <div className="card card-hidden" />;
    }

    const isRed = suit === '♥' || suit === '♦';
    const colorClass = isRed ? 'red' : 'black';

    return (
        <div className={`card ${colorClass}`}>
            <div className="card-value-top">{value}</div>
            <div className="card-suit">{suit}</div>
            <div className="card-value-bottom">{value}</div>
        </div>
    );
};

export default Card;
