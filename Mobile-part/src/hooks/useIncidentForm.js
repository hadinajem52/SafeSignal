import { useCallback, useState } from 'react';
import { formatDate } from '../utils/dateUtils';
import { VALID_CATEGORIES } from '../../../constants/incident';
import { LIMITS } from '../../../constants/limits';

const DEFAULT_SEVERITY = 'medium';

const useIncidentForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date());
  const [severity, setSeverity] = useState(DEFAULT_SEVERITY);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState({});

  const formatIncidentDate = useCallback((date) => formatDate(date), []);

  const setDateToNow = useCallback(() => {
    setIncidentDate(new Date());
  }, []);

  const validateForm = useCallback(
    (location) => {
      const newErrors = {};

      if (!title.trim()) {
        newErrors.title = 'Title is required';
      } else if (title.trim().length < LIMITS.TITLE.MIN) {
        newErrors.title = `Title must be at least ${LIMITS.TITLE.MIN} characters`;
      } else if (title.trim().length > LIMITS.TITLE.MAX) {
        newErrors.title = `Title must not exceed ${LIMITS.TITLE.MAX} characters`;
      }

      if (!description.trim()) {
        newErrors.description = 'Description is required';
      } else if (description.trim().length < LIMITS.DESCRIPTION.MIN) {
        newErrors.description = `Description must be at least ${LIMITS.DESCRIPTION.MIN} characters`;
      } else if (description.trim().length > LIMITS.DESCRIPTION.MAX) {
        newErrors.description = `Description must not exceed ${LIMITS.DESCRIPTION.MAX} characters`;
      }

      if (!selectedCategory) {
        newErrors.category = 'Please select a category';
      } else if (!VALID_CATEGORIES.includes(selectedCategory)) {
        newErrors.category = 'Invalid category selected';
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
    formatDate: formatIncidentDate,
    setDateToNow,
    validateForm,
    resetForm,
    applyDraftForm,
  };
};

export default useIncidentForm;