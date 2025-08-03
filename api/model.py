import tensorflow as tf
import keras
import numpy as np

# Generate mock sequential data for normal behavior
def generate_normal_sequence(length=10):
    """Generate a sequence of normal traffic values with slight noise."""
    return [10 + np.random.normal(0, 1) for _ in range(length)]

def generate_training_data(num_samples=1000, sequence_length=10):
    """Generate training data with normal sequences."""
    sequences = [generate_normal_sequence(sequence_length) for _ in range(num_samples)]
    return np.array(sequences).reshape((num_samples, sequence_length, 1))

# Create training data
normal_data = generate_training_data(1000, 10)  # 1000 sequences, each 10 timesteps long

# Define the LSTM autoencoder model
model = keras.Sequential([
    keras.layers.LSTM(32, activation='relu', input_shape=(10, 1), return_sequences=False),
    keras.layers.RepeatVector(10),  # Repeat the encoded vector for decoding
    keras.layers.LSTM(32, activation='relu', return_sequences=True),
    keras.layers.TimeDistributed(keras.layers.Dense(1))  # Output one value per timestep
])

# Compile the model
model.compile(optimizer='adam', loss='mse')

# Train the model on normal data (autoencoder reconstructs input)
model.fit(normal_data, normal_data, epochs=50, batch_size=32, validation_split=0.1)

# Export model as a SavedModel
model.export('smartguard_model')

# Convert the SavedModel to TFLite
converter = tf.lite.TFLiteConverter.from_saved_model('smartguard_model')
tflite_model = converter.convert()

# Save the TFLite model to a file
with open('smartguard_model.tflite', 'wb') as f:
    f.write(tflite_model)