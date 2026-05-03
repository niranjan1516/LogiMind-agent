import folium

def generate_route_map(depot_location, optimized_route):
    """
    Generates an interactive HTML map showing the truck's live location
    and the optimized delivery path.
    """
    # 1. Initialize map centered around the truck's current location
    m = folium.Map(
        location=[depot_location["latitude"], depot_location["longitude"]],
        zoom_start=12,
        tiles="CartoDB positron" # Clean, modern map style
    )

    # 2. Add the Truck (Depot) Marker
    folium.Marker(
        location=[depot_location["latitude"], depot_location["longitude"]],
        popup="Live Truck Location",
        icon=folium.Icon(color="red", icon="truck", prefix="fa")
    ).add_to(m)

    # 3. Add Delivery Nodes and Draw the Path
    path_coordinates = [[depot_location["latitude"], depot_location["longitude"]]]
    
    for sequence_index, stop in enumerate(optimized_route):
        lat, lon = stop["latitude"], stop["longitude"]
        order_id = stop["order_id"]
        
        # Add stop coordinate to our path line
        path_coordinates.append([lat, lon])
        
        # Add a marker for the delivery stop, numbered by sequence
        folium.Marker(
            location=[lat, lon],
            popup=f"Stop {sequence_index + 1}: {order_id}",
            icon=folium.Icon(color="blue", icon="info-sign")
        ).add_to(m)

    # 4. Draw the optimized route line connecting the points
    folium.PolyLine(
        locations=path_coordinates,
        color="blue",
        weight=4,
        opacity=0.7,
        dash_array="10"
    ).add_to(m)

    # Return the map as an HTML string
    return m.get_root().render()