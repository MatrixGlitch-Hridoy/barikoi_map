import axios from "axios";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";

function calculateNewCoordinates(lat, lon, distance) {
  const earthRadius = 6371000; // Earth radius in meters
  const angularDistance = distance / earthRadius;

  const lat1 = (Math.PI / 180) * lat;
  const lon1 = (Math.PI / 180) * lon;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(0)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(0) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  const newLat = (180 / Math.PI) * lat2;
  const newLon = (180 / Math.PI) * lon2;

  return { latitude: newLat, longitude: newLon };
}

function calculateIntermediateCoordinates(lat1, lon1, lat2, lon2, distance) {
  const numDivisions = Math.ceil(distance / 10);
  const intermediateCoordinates = [];

  for (let i = 0; i <= numDivisions; i++) {
    const f = i / numDivisions;

    const lat = lat1 + f * (lat2 - lat1);
    const lon = lon1 + f * (lon2 - lon1);

    intermediateCoordinates.push({ latitude: lat, longitude: lon });
  }
  return intermediateCoordinates.sort((a, b) => b.latitude - a.latitude);
}
function App() {
  const [uAddress, setUAddress] = useState(""); // set address from user
  const [riderLocation, setRiderLocation] = useState(null); //set rider location using calculateNewCoordinates function
  const [data, setData] = useState(null); // set barikoi rupantar address response
  const [calculatedRiderCoors, setCalculatedRiderCoors] = useState(null); //set rider intermidiates coordinates using calculateIntermediateCoordinates function

  useEffect(() => {
    window.bkoigl.accessToken = Process.env.BARIKOI_API; // Barikoi API
    const map = new window.bkoigl.Map({
      container: "map",
      center: [90.3938010872331, 23.821600277500405],
      zoom: 12,
    });

    // Add Marker on Map Load
    map.on("load", () => {
      const userMarker = new window.bkoigl.Marker({ draggable: false })
        .setLngLat([
          data?.geocoded_address?.longitude,
          data?.geocoded_address?.latitude,
        ])
        .addTo(map);
      let riderMarker = new window.bkoigl.Marker({ draggable: false })
        .setLngLat([riderLocation?.longitude, riderLocation?.latitude])
        .addTo(map);

      // Update riderMarker every 1 second
      if (calculatedRiderCoors !== null && calculatedRiderCoors.length > 1) {
        let currentIndex = 0;
        const intervalId = setInterval(() => {
          if (currentIndex < calculatedRiderCoors.length) {
            const [longitude, latitude] = [
              calculatedRiderCoors[currentIndex].longitude,
              calculatedRiderCoors[currentIndex].latitude,
            ];

            // Create a new marker with updated coordinates
            riderMarker.remove();
            riderMarker = new window.bkoigl.Marker({ draggable: false })
              .setLngLat([longitude, latitude])
              .addTo(map);
            currentIndex = currentIndex + 1;
          } else {
            // Stop updating when the array iteration reaches the end
            clearInterval(intervalId);
          }
        }, 1000);
      }
    });
  }, [data, riderLocation, calculatedRiderCoors]);

  const handleAddress = (e) => {
    e.preventDefault();
    axios
      .post(
        `https://barikoi.xyz/v2/api/search/rupantor/geocode?api_key=${Process.env.BARIKOI_API}`,
        {
          q: uAddress,
        }
      )
      .then(
        (response) => {
          console.log(response);
          setData(response.data);
          setRiderLocation(
            calculateNewCoordinates(
              Number(response?.data?.geocoded_address?.latitude),
              Number(response?.data?.geocoded_address?.longitude),
              5000
            )
          );
        },
        (error) => {
          console.log(error);
        }
      );
  };

  const handleTrackRider = () => {
    const result = calculateIntermediateCoordinates(
      Number(data?.geocoded_address?.latitude),
      Number(data?.geocoded_address?.longitude),
      riderLocation?.latitude,
      riderLocation?.longitude,
      1000
    );
    setCalculatedRiderCoors(result);
  };

  return (
    <div>
      <Helmet>
        <link
          rel="stylesheet"
          href="https://cdn.barikoi.com/bkoi-gl-js/dist/bkoi-gl.css"
        />
      </Helmet>
      <div
        id="map"
        style={{
          width: "50vw",
          height: "70vh",
          boxSizing: "border-box",
          margin: 0,
          padding: 0,
          overflow: "hidden",
        }}
      ></div>
      <input
        placeholder="Enter your address"
        onChange={(e) => setUAddress(e.target.value)}
      />
      <button onClick={handleAddress}>Submit Address</button>
      <button onClick={handleTrackRider}>Track Rider</button>
    </div>
  );
}

export default App;
