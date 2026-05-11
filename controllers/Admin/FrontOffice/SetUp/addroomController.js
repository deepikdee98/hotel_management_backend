const Room = require('../../../../models/Admin/roomModel')
const Hotel = require('../../../../models/SuperAdmin/hotelModel')

// @desc    Add Room
// @route   POST /admin/setup/rooms
// @access  Private (Hotel Admin)
const addRoom = async (req, res) => {
    try{
        const { roomNumber, roomType, floor} = req.body;
        const hotelId = req.user.hotelId;

        if(!roomNumber || !roomType || !floor){
            return res.status(400).json({
                message: "All fields are required"
            })
        }

        let actualRoomNumber = roomNumber;
        const existing = await Room.findOne({ hotelId, roomNumber: actualRoomNumber });

        if(existing){
            // Find highest room number for this floor and hotel
            const existingRooms = await Room.find({ hotelId, floor: Number(floor) });
            const numericRooms = existingRooms
                .map(r => parseInt(r.roomNumber, 10))
                .filter(n => !isNaN(n));
            
            if (numericRooms.length > 0) {
                const maxRoom = Math.max(...numericRooms);
                actualRoomNumber = String(maxRoom + 1);
            } else {
                // If the one provided exists but we can't find numeric ones, 
                // we should still probably error or try to increment if it's numeric
                const startNum = parseInt(roomNumber, 10);
                if (!isNaN(startNum)) {
                    actualRoomNumber = String(startNum + 1);
                    // Check again if the incremented one exists
                    let collision = await Room.findOne({ hotelId, roomNumber: actualRoomNumber });
                    while (collision) {
                        actualRoomNumber = String(parseInt(actualRoomNumber, 10) + 1);
                        collision = await Room.findOne({ hotelId, roomNumber: actualRoomNumber });
                    }
                } else {
                    return res.status(400).json({
                        message: "Room number already exists for this hotel"
                    })
                }
            }
        }
        const hotel = await Hotel.findOne({ _id: hotelId, hotelId: req.user.hotelId });
        
        const roomCount = await Room.countDocuments({ hotelId });
        
        if(roomCount >= hotel.totalRooms){
            return res.status(400).json({
                message: `Room limit reached. Maximum allowed: ${hotel.totalRooms}.`
            })
        }
        

        const room = await Room.create({
            hotelId,
            roomNumber: actualRoomNumber,
            roomType,
            floor
        });

        res.status(201).json({
            message: "Room added successfully",
            room: {
                _id: room._id,
                hotelId: room.hotelId,
                roomNumber: room.roomNumber,
                roomType: room.roomType,
                floor: room.floor,
                createdAt: room.createdAt,
                updatedAt: room.updatedAt
            }
        })
    }
    catch(error){
        res.status(500).json({
            message: "Failed to add room",
            error: error.message
        })
    }
}

module.exports = {
    addRoom
}