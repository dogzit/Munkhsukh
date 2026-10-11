"use client";
import React, { useState } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { DraggableSeat } from './DraggableSeat';

interface SeatData {
    id: string;
    x: number;
    y: number;
    bookedBy: string | null;
}

export default function BusManager() {
    const [isEditMode, setIsEditMode] = useState(true);

    const [currentUserName] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("name") || "Guest";
        }
        return "Guest";
    });

    // Зураг дээрх шиг урт автобусны суудлын анхны байрлал (2 + 2 бүтэц)
    const [seats, setSeats] = useState<SeatData[]>(() => {
        const initialSeats: SeatData[] = [];
        const rows = 12; // Урт автобус тул 12 эгнээ
        let seatCount = 1;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < 4; c++) {
                // Голын замыг (c === 2) хоосон орхиж, суудлуудыг байрлуулах
                const gap = c >= 2 ? 60 : 0;
                initialSeats.push({
                    id: `S${seatCount++}`,
                    x: c * 55 + 60 + gap,
                    y: r * 65 + 140,
                    bookedBy: null
                });
            }
        }
        // Хамгийн арын 5 суудал
        for (let c = 0; c < 5; c++) {
            initialSeats.push({
                id: `S${seatCount++}`,
                x: c * 55 + 60,
                y: rows * 65 + 140,
                bookedBy: null
            });
        }
        return initialSeats;
    });

    const sensors = useSensors(useSensor(PointerSensor));

    function handleDragEnd(event: DragEndEvent) {
        const { active, delta } = event;
        setSeats((prev) => prev.map((seat) => {
            if (seat.id === active.id) {
                return { ...seat, x: seat.x + delta.x, y: seat.y + delta.y };
            }
            return seat;
        }));
    }

    function toggleSeat(id: string) {
        setSeats(prev => prev.map(seat => {
            if (seat.id === id) {
                return { ...seat, bookedBy: seat.bookedBy ? null : currentUserName };
            }
            return seat;
        }));
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center">
            {/* Header Control */}
            <div className="fixed top-6 z-[100] flex flex-col items-center gap-2">
                <div className="flex gap-2 bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-2xl">
                    <button onClick={() => setIsEditMode(true)} className={`px-6 py-2 rounded-xl text-xs font-bold transition ${isEditMode ? "bg-zinc-700 text-white" : "text-zinc-500"}`}>ДИЗАЙН</button>
                    <button onClick={() => setIsEditMode(false)} className={`px-6 py-2 rounded-xl text-xs font-bold transition ${!isEditMode ? "bg-blue-600 text-white" : "text-zinc-500"}`}>ЗАХИАЛГА</button>
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-tighter">Зорчигч: {currentUserName}</div>
            </div>

            {/* Автобусны Их Бие (Урт хувилбар) */}
            <div className="mt-24 relative w-[380px] h-[1050px] bg-zinc-950 rounded-[80px] border-[10px] border-zinc-900 shadow-2xl overflow-y-auto custom-scrollbar">

                {/* Жолоочийн хэсэг */}
                <div className="absolute top-0 w-full h-32 border-b-4 border-zinc-900 bg-zinc-900/30 flex flex-col items-center justify-end pb-4">
                    <div className="w-24 h-2 bg-zinc-800 rounded-full mb-2 opacity-50" />
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Front / Жолооч</span>
                </div>

                {/* Суудлууд */}
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
                    {seats.map((seat) => (
                        <DraggableSeat
                            key={seat.id}
                            id={seat.id}
                            x={seat.x}
                            y={seat.y}
                            userName={seat.bookedBy}
                            isEditMode={isEditMode}
                            isSelected={seat.bookedBy !== null}
                            onSelect={toggleSeat}
                        />
                    ))}
                </DndContext>

                {/* Арын хэсэг */}
                <div className="absolute bottom-4 w-full text-center text-[10px] text-zinc-800 font-bold uppercase">Эгнээний төгсгөл</div>
            </div>

            <div className="mt-8 mb-10 text-zinc-800 text-[10px] font-bold">TOUR BUS LAYOUT v2</div>
        </div>
    );
}