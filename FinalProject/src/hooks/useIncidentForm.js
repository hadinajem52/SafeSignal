import { useCallback, useState } from 'react';

const DEFAULT_SEVERITY = 'medium';

const useIncidentForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date());
  const [severity, setSeverity] = useState(DEFAULT_SEVERITY);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState({});

  const formatDate = useCallback((date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const setDateToNow = useCallback(() => {
    setIncidentDate(new Date());
  }, []);

  const validateForm = useCallback(
    (location) => {
      const newErrors = {};

      if (!title.trim()) {
        newErrors.title = 'Title is required';
      } else if (title.trim().length < 5) {
        newErrors.title = 'Title must be at least 5 characters';
      } else if (title.trim().length > 255) {
        newErrors.title = 'Title must not exceed 255 characters';
      }

      if (!description.trim()) {
        newErrors.description = 'Description is required';
      } else if (description.trim().length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      } else if (description.trim().length > 5000) {
        newErrors.description = 'Description must not exceed 5000 characters';
      }

      if (!selectedCategory) {
        newErrors.category = 'Please select a category';
      }

      if (!location) {
        newErrors.location = 'Please set the incident location';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [description, selectedCategory, title]
  );

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setSelectedCategory('');
    setIncidentDate(new Date());
    setSeverity(DEFAULT_SEVERITY);
    setIsAnonymous(false);
    setErrors({});
  }, []);

  const applyDraftForm = useCallback((draft) => {
    setTitle(draft?.title || '');
    setDescription(draft?.description || '');
    setSelectedCategory(draft?.category || '');
    setSeverity(draft?.severity || DEFAULT_SEVERITY);
    setIsAnonymous(draft?.isAnonymous || false);

    if (draft?.incidentDate) {
      setIncidentDate(new Date(draft.incidentDate));
    }
  }, []);

  return {
    title,
    setTitle,
    description,
    setDescription,
    selectedCategory,
    setSelectedCategory,
    incidentDate,
    setIncidentDate,
    severity,
    setSeverity,
    isAnonymous,
    setIsAnonymous,
    errors,
    setErrors,
    formatDate,
    setDateToNow,
    validateForm,
    resetForm,
    applyDraftForm,
  };
};

export default useIncidentForm;