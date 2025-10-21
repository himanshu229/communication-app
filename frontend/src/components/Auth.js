import React, { useState } from 'react';
import { User, Phone, MessageCircle, Shield } from 'lucide-react';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate form before submitting
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const payload = isLogin 
        ? { phoneNumber: formData.phoneNumber }
        : { name: formData.name.trim(), phoneNumber: formData.phoneNumber };

      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber') {
      // Only allow digits and limit to 10 characters
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData({
        ...formData,
        [name]: digitsOnly
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const validateForm = () => {
    if (!isLogin && (!formData.name.trim() || formData.name.trim().length < 2)) {
      setError('Name must be at least 2 characters long');
      return false;
    }
    
    if (!formData.phoneNumber || formData.phoneNumber.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return false;
    }
    
    return true;
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-3 sm:p-5">
      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-10 w-full max-w-md shadow-2xl border border-white border-opacity-20 animate-fadeIn">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <Shield className="text-indigo-500 w-6 h-6 sm:w-8 sm:h-8" />
            <h1 className="text-gray-800 text-2xl sm:text-3xl font-bold m-0">SecureChat</h1>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm m-0">
            End-to-end encrypted messaging for secure communication
          </p>
        </div>

        <div className="flex bg-gray-100 rounded-lg sm:rounded-xl p-1 mb-6 sm:mb-8">
          <button
            className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none bg-transparent rounded-md sm:rounded-lg font-semibold cursor-pointer transition-all duration-300 text-sm sm:text-base ${
              isLogin 
                ? 'bg-white text-indigo-500 shadow-md' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 px-2 sm:px-3 py-2 sm:py-3 border-none bg-transparent rounded-md sm:rounded-lg font-semibold cursor-pointer transition-all duration-300 text-sm sm:text-base ${
              !isLogin 
                ? 'bg-white text-indigo-500 shadow-md' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
          {!isLogin && (
            <div className="relative flex flex-col items-stretch">
              <User className="absolute left-3 sm:left-4 top-3 sm:top-4 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 z-10" />
              <input
                type="text"
                name="name"
                placeholder="Full Name (min 2 characters)"
                value={formData.name}
                onChange={handleInputChange}
                required={!isLogin}
                className={`w-full py-3 sm:py-4 px-3 sm:px-4 pl-10 sm:pl-12 border-2 rounded-lg sm:rounded-xl text-sm sm:text-base transition-all duration-300 bg-white focus:outline-none focus:ring-3 ${
                  !isLogin && formData.name && formData.name.trim().length < 2 
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100' 
                    : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
                minLength="2"
                title="Please enter at least 2 characters"
              />
              {!isLogin && formData.name && formData.name.trim().length > 0 && formData.name.trim().length < 2 && (
                <div className="mt-1 text-xs text-red-400 font-medium pl-1">
                  Name must be at least 2 characters
                </div>
              )}
            </div>
          )}

          <div className="relative flex flex-col items-stretch">
            <Phone className="absolute left-3 sm:left-4 top-3 sm:top-4 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 z-10" />
            <input
              type="tel"
              name="phoneNumber"
              placeholder="Phone Number (10 digits)"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              required
              className={`w-full py-3 sm:py-4 px-3 sm:px-4 pl-10 sm:pl-12 border-2 rounded-lg sm:rounded-xl text-sm sm:text-base transition-all duration-300 bg-white focus:outline-none focus:ring-3 ${
                formData.phoneNumber && formData.phoneNumber.length !== 10 
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100' 
                  : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
              maxLength="10"
              pattern="[0-9]{10}"
              title="Please enter exactly 10 digits"
            />
            {formData.phoneNumber && formData.phoneNumber.length > 0 && formData.phoneNumber.length !== 10 && (
              <div className="mt-1 text-xs text-red-400 font-medium pl-1">
                {formData.phoneNumber.length}/10 digits - Must be exactly 10 digits
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 py-3 px-4 rounded-lg text-sm border-l-4 border-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold cursor-pointer transition-all duration-300 mt-2 sm:mt-3 hover:transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                {isLogin ? 'Login' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-4 sm:mt-5 py-2 sm:py-3 bg-indigo-50 rounded-lg text-indigo-500 text-xs sm:text-sm font-medium">
          <Shield size={14} className="sm:w-4 sm:h-4" />
          <span>All messages are end-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;